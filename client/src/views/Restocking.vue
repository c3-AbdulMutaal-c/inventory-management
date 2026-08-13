<template>
  <div class="restocking">
    <div class="page-header">
      <h2>Restocking Planner</h2>
      <p>Set a budget, review demand-based recommendations, and place a restock order.</p>
    </div>

    <div v-if="loading" class="loading">Loading recommendations...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <!-- Budget Slider Card -->
      <div class="card budget-card">
        <div class="card-header">
          <div class="card-title">Budget</div>
        </div>
        <div class="budget-slider">
          <div class="budget-display">{{ formatCurrency(budget) }}</div>
          <input
            type="range"
            v-model.number="budget"
            :min="0"
            :max="budgetMax"
            :step="5000"
            class="slider-input"
          />
          <div class="slider-labels">
            <span>$0</span>
            <span>{{ formatCurrency(budgetMax) }}</span>
          </div>
        </div>
      </div>

      <!-- Success / Error Banners -->
      <div v-if="successMessage" class="success-banner">{{ successMessage }}</div>
      <div v-if="submitError" class="error-banner">{{ submitError }}</div>

      <!-- Recommendations Table Card -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Recommendations ({{ recommendations.length }} items)</div>
        </div>
        <div class="table-container">
          <table class="restocking-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Item</th>
                <th class="num-col">Current Demand</th>
                <th class="num-col">Forecast</th>
                <th class="num-col">Suggested Qty</th>
                <th class="num-col">Unit Cost</th>
                <th class="num-col">Line Total</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in recommendations"
                :key="row.sku"
                :class="{ 'over-budget': isOverBudget(row) }"
              >
                <td><strong>{{ row.sku }}</strong></td>
                <td>{{ row.name }}</td>
                <td class="num-col">{{ row.current_demand }}</td>
                <td class="num-col">{{ row.forecasted_demand }}</td>
                <td class="num-col">
                  <input
                    type="number"
                    min="0"
                    v-model.number="row.quantity"
                    class="qty-input"
                  />
                </td>
                <td class="num-col">{{ formatCurrency(row.unit_cost) }}</td>
                <td class="num-col">{{ formatCurrency(row.quantity * row.unit_cost) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Summary Stats -->
        <div class="summary-stats">
          <div class="stat-item">
            <div class="stat-label">Projected Total</div>
            <div class="stat-value">{{ formatCurrency(projectedTotal) }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Budget</div>
            <div class="stat-value">{{ formatCurrency(budget) }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Remaining</div>
            <div class="stat-value" :class="{ 'stat-negative': remaining < 0 }">{{ formatCurrency(remaining) }}</div>
          </div>
          <div class="stat-action">
            <button
              class="place-order-btn"
              :disabled="projectedTotal === 0 || projectedTotal > budget || submitting"
              @click="placeOrder"
            >
              {{ submitting ? 'Placing Order...' : 'Place Order' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'

export default {
  name: 'Restocking',
  setup() {
    const router = useRouter()

    const loading = ref(true)
    const error = ref(null)
    const recommendations = ref([])
    const budget = ref(0)
    const budgetMax = ref(100000)
    const submitting = ref(false)
    const successMessage = ref(null)
    const submitError = ref(null)

    const projectedTotal = computed(() => {
      return recommendations.value.reduce((sum, row) => sum + row.quantity * row.unit_cost, 0)
    })

    const remaining = computed(() => {
      return budget.value - projectedTotal.value
    })

    // Build a running cumulative map so we can mark which rows push over budget.
    // Returns a Set of SKUs whose inclusion tips the running total over budget.
    const overBudgetSkus = computed(() => {
      const over = new Set()
      let running = 0
      for (const row of recommendations.value) {
        const lineTotal = row.quantity * row.unit_cost
        running += lineTotal
        if (running > budget.value) {
          over.add(row.sku)
        }
      }
      return over
    })

    const isOverBudget = (row) => {
      return overBudgetSkus.value.has(row.sku)
    }

    const formatCurrency = (value) => {
      return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    }

    const loadData = async () => {
      loading.value = true
      error.value = null
      try {
        const [forecasts, inventoryItems] = await Promise.all([
          api.getDemandForecasts(),
          api.getInventory({})
        ])

        const invBySku = {}
        for (const inv of inventoryItems) {
          invBySku[inv.sku] = inv
        }

        const recs = []
        for (const f of forecasts) {
          const inv = invBySku[f.item_sku]
          if (!inv) continue  // no unit cost — skip
          const gap = f.forecasted_demand - f.current_demand
          recs.push({
            sku: f.item_sku,
            name: f.item_name,
            current_demand: f.current_demand,
            forecasted_demand: f.forecasted_demand,
            gap,
            unit_cost: inv.unit_cost,
            quantity: Math.max(0, gap)
          })
        }

        // Sort by forecasted_demand descending
        recs.sort((a, b) => b.forecasted_demand - a.forecasted_demand)
        recommendations.value = recs

        // Compute defaultTotal from initial quantities
        const defaultTotal = recs.reduce((sum, r) => sum + r.quantity * r.unit_cost, 0)

        // budgetMax = ceil(defaultTotal * 1.5 / 10000) * 10000, min 100000
        const computed_max = Math.ceil(defaultTotal * 1.5 / 10000) * 10000
        budgetMax.value = Math.max(100000, computed_max)

        // Initial budget = defaultTotal so Place Order is enabled on load
        budget.value = defaultTotal
      } catch (err) {
        error.value = 'Failed to load recommendations: ' + err.message
      } finally {
        loading.value = false
      }
    }

    const placeOrder = async () => {
      submitting.value = true
      submitError.value = null
      successMessage.value = null
      try {
        const lines = recommendations.value
          .filter(r => r.quantity > 0)
          .map(r => ({ sku: r.sku, quantity: r.quantity }))

        const order = await api.createSubmittedOrder({ budget: budget.value, lines })
        successMessage.value = `Order ${order.id} submitted`
        setTimeout(() => {
          router.push('/orders')
        }, 800)
      } catch (err) {
        const detail = err.response && err.response.data && err.response.data.detail
          ? err.response.data.detail
          : err.message
        submitError.value = 'Failed to place order: ' + detail
      } finally {
        submitting.value = false
      }
    }

    onMounted(loadData)

    return {
      loading,
      error,
      recommendations,
      budget,
      budgetMax,
      projectedTotal,
      remaining,
      isOverBudget,
      formatCurrency,
      submitting,
      successMessage,
      submitError,
      placeOrder
    }
  }
}
</script>

<style scoped>
.restocking {
  /* root container — padding handled by main-content in App.vue */
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-header h2 {
  margin-bottom: 0.25rem;
}

.page-header p {
  color: #64748b;
  font-size: 0.875rem;
}

.loading,
.error {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}

.error {
  color: #ef4444;
}

/* Budget slider card */
.budget-card .card-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.budget-slider {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.budget-display {
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.slider-input {
  width: 100%;
  accent-color: #3b82f6;
  height: 6px;
  cursor: pointer;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #94a3b8;
}

/* Banners */
.success-banner {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  color: #166534;
  font-weight: 500;
}

.error-banner {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  font-weight: 500;
}

/* Restocking table */
.restocking-table {
  table-layout: auto;
  width: 100%;
}

.num-col {
  text-align: right;
}

/* Over-budget row styling */
.over-budget {
  background-color: #fef3c7 !important;
  color: #92400e;
}

.over-budget strong {
  color: #92400e;
}

/* Quantity input */
.qty-input {
  width: 80px;
  text-align: right;
  padding: 0.25rem 0.375rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #0f172a;
  background: #f8fafc;
}

.qty-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Summary stats footer */
.summary-stats {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 0 0 12px 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
}

.stat-negative {
  color: #991b1b;
}

.stat-action {
  margin-left: auto;
}

.place-order-btn {
  padding: 0.625rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.place-order-btn:hover:not(:disabled) {
  background: #2563eb;
}

.place-order-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
