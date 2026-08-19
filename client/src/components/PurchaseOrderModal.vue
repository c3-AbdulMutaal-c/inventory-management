<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen && backlogItem" class="modal-overlay" @click="close">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">
              {{ mode === 'create' ? 'Create Purchase Order' : 'Purchase Order Details' }}
            </h3>
            <button class="close-button" @click="close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="shortage-header">
              <div class="shortage-title-section">
                <h4 class="item-name">{{ backlogItem.item_name }}</h4>
                <div class="item-sku">SKU: {{ backlogItem.item_sku }}</div>
              </div>
            </div>

            <!-- Create mode: form -->
            <form v-if="mode === 'create'" class="po-form" @submit.prevent="submitForm">
              <div v-if="submitError" class="form-error">{{ submitError }}</div>

              <div class="form-group">
                <label class="form-label" for="supplier-name">Supplier Name</label>
                <input
                  id="supplier-name"
                  v-model="form.supplierName"
                  type="text"
                  class="form-input"
                  placeholder="Enter supplier name"
                  required
                />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="quantity">Quantity</label>
                  <input
                    id="quantity"
                    v-model.number="form.quantity"
                    type="number"
                    min="1"
                    step="1"
                    class="form-input"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label" for="unit-cost">Unit Cost ($)</label>
                  <input
                    id="unit-cost"
                    v-model.number="form.unitCost"
                    type="number"
                    min="0.01"
                    step="0.01"
                    class="form-input"
                    required
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="expected-delivery-date">Expected Delivery Date</label>
                <input
                  id="expected-delivery-date"
                  v-model="form.expectedDeliveryDate"
                  type="date"
                  class="form-input"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="notes">Notes (optional)</label>
                <textarea
                  id="notes"
                  v-model="form.notes"
                  class="form-textarea"
                  rows="3"
                  placeholder="Additional notes for this order"
                ></textarea>
              </div>
            </form>

            <!-- View mode: read-only PO details -->
            <div v-else>
              <div v-if="loadingPO" class="loading">Loading purchase order...</div>
              <div v-else-if="loadError" class="form-error">{{ loadError }}</div>
              <div v-else-if="purchaseOrder" class="info-grid">
                <div class="info-item">
                  <div class="info-label">Purchase Order ID</div>
                  <div class="info-value order-id">{{ purchaseOrder.id }}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">Status</div>
                  <div class="info-value">
                    <span class="badge">{{ purchaseOrder.status }}</span>
                  </div>
                </div>

                <div class="info-item">
                  <div class="info-label">Supplier</div>
                  <div class="info-value">{{ purchaseOrder.supplier_name }}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">Quantity</div>
                  <div class="info-value">{{ purchaseOrder.quantity }} units</div>
                </div>

                <div class="info-item">
                  <div class="info-label">Unit Cost</div>
                  <div class="info-value">{{ formatCurrency(purchaseOrder.unit_cost) }}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">Total Cost</div>
                  <div class="info-value">{{ formatCurrency(purchaseOrder.quantity * purchaseOrder.unit_cost) }}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">Expected Delivery</div>
                  <div class="info-value">{{ formatDate(purchaseOrder.expected_delivery_date) }}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">Created</div>
                  <div class="info-value">{{ formatDate(purchaseOrder.created_date) }}</div>
                </div>

                <div v-if="purchaseOrder.notes" class="info-item full-width">
                  <div class="info-label">Notes</div>
                  <div class="info-value">{{ purchaseOrder.notes }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="close">Close</button>
            <button
              v-if="mode === 'create'"
              class="btn-primary"
              :disabled="submitting"
              @click="submitForm"
            >
              {{ submitting ? 'Creating...' : 'Create Purchase Order' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { api } from '../api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  backlogItem: {
    type: Object,
    default: null
  },
  mode: {
    type: String,
    default: 'create'
  }
})

const emit = defineEmits(['close', 'po-created'])

const form = reactive({
  supplierName: '',
  quantity: 1,
  unitCost: 0,
  expectedDeliveryDate: '',
  notes: ''
})

const submitting = ref(false)
const submitError = ref(null)

const purchaseOrder = ref(null)
const loadingPO = ref(false)
const loadError = ref(null)

// Reset/prepare state whenever the modal is opened for a given backlog item/mode
watch(
  () => [props.isOpen, props.backlogItem, props.mode],
  () => {
    if (!props.isOpen || !props.backlogItem) return

    if (props.mode === 'create') {
      // Default quantity to the shortage amount (needed - available)
      const shortage = props.backlogItem.quantity_needed - props.backlogItem.quantity_available
      form.supplierName = ''
      form.quantity = shortage > 0 ? shortage : 1
      form.unitCost = 0
      form.expectedDeliveryDate = ''
      form.notes = ''
      submitError.value = null
    } else {
      loadPurchaseOrder()
    }
  },
  { immediate: true }
)

const loadPurchaseOrder = async () => {
  // Prefer the PO already attached to the backlog item (set by handlePOCreated) to avoid an extra fetch
  if (props.backlogItem.purchase_order) {
    purchaseOrder.value = props.backlogItem.purchase_order
    loadError.value = null
    return
  }

  loadingPO.value = true
  loadError.value = null
  try {
    purchaseOrder.value = await api.getPurchaseOrderByBacklogItem(props.backlogItem.id)
  } catch (err) {
    loadError.value = 'Failed to load purchase order details'
    console.error(err)
  } finally {
    loadingPO.value = false
  }
}

const submitForm = async () => {
  submitError.value = null

  if (!form.supplierName.trim()) {
    submitError.value = 'Supplier name is required'
    return
  }
  if (!form.quantity || form.quantity <= 0) {
    submitError.value = 'Quantity must be greater than 0'
    return
  }
  if (!form.unitCost || form.unitCost <= 0) {
    submitError.value = 'Unit cost must be greater than 0'
    return
  }
  if (!form.expectedDeliveryDate) {
    submitError.value = 'Expected delivery date is required'
    return
  }

  submitting.value = true
  try {
    const created = await api.createPurchaseOrder({
      backlog_item_id: props.backlogItem.id,
      supplier_name: form.supplierName,
      quantity: form.quantity,
      unit_cost: form.unitCost,
      expected_delivery_date: form.expectedDeliveryDate,
      notes: form.notes || undefined
    })
    emit('po-created', created)
    close()
  } catch (err) {
    submitError.value = err.response?.data?.detail || 'Failed to create purchase order'
    console.error(err)
  } finally {
    submitting.value = false
  }
}

const close = () => {
  emit('close')
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A'
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.modal-container {
  background: var(--color-surface);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.025em;
}

.close-button {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.close-button:hover {
  background: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.shortage-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 1.5rem;
}

.shortage-title-section {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
}

.item-sku {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-family: 'Monaco', 'Courier New', monospace;
}

.po-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.813rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}

.form-input,
.form-textarea {
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.938rem;
  font-family: inherit;
  color: var(--color-text-primary);
  background: var(--color-surface);
}

.form-textarea {
  resize: vertical;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-error {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  font-size: 0.875rem;
  font-weight: 500;
}

.loading {
  padding: 1rem 0;
  color: var(--color-text-secondary);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-label {
  font-size: 0.813rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}

.info-value {
  font-size: 0.938rem;
  color: var(--color-text-primary);
  font-weight: 500;
}

.info-value.order-id {
  font-family: 'Monaco', 'Courier New', monospace;
  color: var(--color-primary);
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-secondary {
  padding: 0.625rem 1.25rem;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-secondary:hover {
  background: var(--color-border);
  border-color: var(--color-border-strong);
}

.btn-primary {
  padding: 0.625rem 1.25rem;
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  color: white;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Modal transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.2s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}
</style>
