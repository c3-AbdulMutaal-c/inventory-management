<template>
  <div class="restocking">
    <div class="page-header">
      <h2>{{ t('restocking.title') }}</h2>
      <p>{{ t('restocking.description') }}</p>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('restocking.budgetLabel') }}</h3>
        </div>
        <div class="budget-slider">
          <input
            type="range"
            min="0"
            max="8000"
            step="100"
            v-model.number="budget"
            class="slider"
          />
          <div class="budget-readout">{{ currencySymbol }}{{ budget.toLocaleString() }}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('restocking.recommendedItems') }}</h3>
        </div>

        <div v-if="recommendations.length === 0" class="empty-state">
          {{ t('restocking.noRecommendations') }}
        </div>
        <div v-else>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>{{ t('restocking.table.sku') }}</th>
                  <th>{{ t('restocking.table.itemName') }}</th>
                  <th>{{ t('restocking.table.shortfall') }}</th>
                  <th>{{ t('restocking.table.unitCost') }}</th>
                  <th>{{ t('restocking.table.quantity') }}</th>
                  <th>{{ t('restocking.table.lineTotal') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rec in recommendations" :key="rec.item_sku">
                  <td><strong>{{ rec.item_sku }}</strong></td>
                  <td>{{ translateProductName(rec.item_name) }}</td>
                  <td>{{ rec.shortfall }}</td>
                  <td>{{ currencySymbol }}{{ rec.unit_cost.toFixed(2) }}</td>
                  <td>
                    {{ rec.quantity }}
                    <span v-if="rec.partial" class="badge warning partial-badge">
                      {{ t('restocking.table.partial') }}
                    </span>
                  </td>
                  <td>{{ currencySymbol }}{{ rec.lineTotal.toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="totals-summary">
            <div class="totals-row">
              <span class="totals-label">{{ t('restocking.totalCost') }}</span>
              <span class="totals-value">{{ currencySymbol }}{{ totalCost.toFixed(2) }}</span>
            </div>
            <div class="totals-row">
              <span class="totals-label">{{ t('restocking.remainingBudget') }}</span>
              <span class="totals-value">{{ currencySymbol }}{{ remainingBudget.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <div class="place-order-section">
          <button
            class="place-order-btn"
            :disabled="placing || recommendations.length === 0"
            @click="placeOrder"
          >
            {{ placing ? t('restocking.placingOrder') : t('restocking.placeOrder') }}
          </button>

          <div v-if="placeError" class="error">{{ placeError }}</div>

          <div v-if="placedOrder" class="stat-card success confirmation-card">
            <div class="confirmation-title">{{ t('restocking.orderPlaced') }}</div>
            <div class="confirmation-row">
              <span class="confirmation-label">{{ t('restocking.orderNumber') }}</span>
              <span class="confirmation-value">{{ placedOrder.order_number }}</span>
            </div>
            <div class="confirmation-row">
              <span class="confirmation-label">{{ t('restocking.totalCost') }}</span>
              <span class="confirmation-value">{{ currencySymbol }}{{ placedOrder.total_cost.toFixed(2) }}</span>
            </div>
            <div class="confirmation-row">
              <span class="confirmation-label">{{ t('restocking.leadTime') }}</span>
              <span class="confirmation-value">{{ t('restocking.leadTimeDays', { count: placedOrder.lead_time_days }) }}</span>
            </div>
            <div class="confirmation-row">
              <span class="confirmation-label">{{ t('restocking.expectedDelivery') }}</span>
              <span class="confirmation-value">{{ formatDate(placedOrder.expected_delivery_date) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '../api'
import { useI18n } from '../composables/useI18n'

export default {
  name: 'Restocking',
  setup() {
    const { t, currentCurrency, currentLocale, translateProductName } = useI18n()
    const currencySymbol = computed(() => currentCurrency.value === 'JPY' ? '¥' : '$')

    const loading = ref(true)
    const error = ref(null)
    const forecasts = ref([])

    const budget = ref(2500)
    const placing = ref(false)
    const placeError = ref(null)
    const placedOrder = ref(null)

    const loadForecasts = async () => {
      try {
        loading.value = true
        error.value = null
        forecasts.value = await api.getDemandForecasts()
      } catch (err) {
        error.value = 'Failed to load demand forecasts: ' + err.message
      } finally {
        loading.value = false
      }
    }

    // Items whose forecasted demand exceeds current demand, ranked by
    // largest shortfall first (ties broken by SKU for deterministic ordering)
    const shortfallItems = computed(() => {
      return forecasts.value
        .map(f => ({ ...f, shortfall: f.forecasted_demand - f.current_demand }))
        .filter(f => f.shortfall > 0)
        .sort((a, b) => {
          if (b.shortfall !== a.shortfall) return b.shortfall - a.shortfall
          return a.item_sku.localeCompare(b.item_sku)
        })
    })

    // Greedy budget fill: walk the shortfall-ranked list and take each item's
    // full shortfall if it fits in the remaining budget. If an item doesn't
    // fully fit, take as many partial units of it as the remaining budget
    // allows and then STOP — we intentionally do not skip ahead to a cheaper,
    // lower-ranked item with the leftover funds, since that would abandon the
    // demand-priority ordering the recommendations are built on.
    const recommendations = computed(() => {
      const recs = []
      let remaining = budget.value

      for (const item of shortfallItems.value) {
        const fullCost = item.shortfall * item.unit_cost
        if (fullCost <= remaining) {
          recs.push({
            item_sku: item.item_sku,
            item_name: item.item_name,
            shortfall: item.shortfall,
            unit_cost: item.unit_cost,
            quantity: item.shortfall,
            lineTotal: fullCost,
            partial: false
          })
          remaining -= fullCost
        } else {
          const partialQty = Math.floor(remaining / item.unit_cost)
          if (partialQty > 0) {
            const lineTotal = partialQty * item.unit_cost
            recs.push({
              item_sku: item.item_sku,
              item_name: item.item_name,
              shortfall: item.shortfall,
              unit_cost: item.unit_cost,
              quantity: partialQty,
              lineTotal,
              partial: true
            })
            remaining -= lineTotal
          }
          break
        }
      }

      return recs
    })

    const totalCost = computed(() => recommendations.value.reduce((sum, r) => sum + r.lineTotal, 0))
    const remainingBudget = computed(() => budget.value - totalCost.value)

    watch(budget, () => {
      placedOrder.value = null
      placeError.value = null
    })

    const placeOrder = async () => {
      placing.value = true
      placeError.value = null
      try {
        const order = await api.createRestockOrder({
          budget: budget.value,
          items: recommendations.value.map(r => ({
            item_sku: r.item_sku,
            item_name: r.item_name,
            quantity: r.quantity,
            unit_cost: r.unit_cost
          }))
        })
        placedOrder.value = order
      } catch (err) {
        placeError.value = err.response?.data?.detail || err.message
      } finally {
        placing.value = false
      }
    }

    const formatDate = (dateString) => {
      const locale = currentLocale.value === 'ja' ? 'ja-JP' : 'en-US'
      return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    onMounted(loadForecasts)

    return {
      t,
      loading,
      error,
      budget,
      currencySymbol,
      shortfallItems,
      recommendations,
      totalCost,
      remainingBudget,
      placing,
      placeError,
      placedOrder,
      placeOrder,
      formatDate,
      translateProductName
    }
  }
}
</script>

<style scoped>
.budget-slider {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--color-border);
  outline: none;
  appearance: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  border: none;
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  border: none;
}

.budget-readout {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  min-width: 120px;
  text-align: right;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
  font-size: 0.938rem;
}

.partial-badge {
  margin-left: 0.5rem;
}

.totals-summary {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.938rem;
}

.totals-label {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.totals-value {
  color: var(--color-text-primary);
  font-weight: 700;
}

.place-order-section {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--color-border);
}

.place-order-btn {
  padding: 0.625rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.938rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.place-order-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.place-order-btn:disabled {
  background: var(--color-border-strong);
  cursor: not-allowed;
}

.confirmation-card {
  margin-top: 1rem;
}

.confirmation-title {
  font-weight: 700;
  color: var(--color-success);
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

.confirmation-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.875rem;
}

.confirmation-label {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.confirmation-value {
  color: var(--color-text-primary);
  font-weight: 600;
}
</style>
