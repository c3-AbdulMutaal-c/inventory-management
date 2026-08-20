<template>
  <div class="reports">
    <div class="page-header">
      <h2>{{ t("reports.title") }}</h2>
      <p>{{ t("reports.description") }}</p>
    </div>

    <div v-if="loading" class="loading">{{ t("reports.loading") }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <!-- Quarterly Performance -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">
            {{ t("reports.quarterlyPerformance.title") }}
          </h3>
        </div>
        <div v-if="quarterlyData.length === 0" class="no-data">
          {{ t("common.noData") }}
        </div>
        <div v-else class="table-container">
          <table class="reports-table">
            <thead>
              <tr>
                <th>{{ t("reports.quarterlyPerformance.quarter") }}</th>
                <th>{{ t("reports.quarterlyPerformance.totalOrders") }}</th>
                <th>{{ t("reports.quarterlyPerformance.totalRevenue") }}</th>
                <th>{{ t("reports.quarterlyPerformance.avgOrderValue") }}</th>
                <th>{{ t("reports.quarterlyPerformance.fulfillmentRate") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in quarterlyData" :key="q.quarter">
                <td>
                  <strong>{{ q.quarter }}</strong>
                </td>
                <td>{{ q.total_orders }}</td>
                <td>{{ formatCurrency(q.total_revenue) }}</td>
                <td>{{ formatCurrency(q.avg_order_value) }}</td>
                <td>
                  <span :class="getFulfillmentClass(q.fulfillment_rate)">
                    {{ q.fulfillment_rate }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Monthly Trends Chart -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t("reports.monthlyTrend.title") }}</h3>
        </div>
        <div v-if="monthlyData.length === 0" class="no-data">
          {{ t("common.noData") }}
        </div>
        <div v-else class="chart-container">
          <div class="bar-chart">
            <div
              v-for="month in monthlyData"
              :key="month.month"
              class="bar-wrapper"
            >
              <div class="bar-container">
                <div
                  class="bar"
                  :style="{ height: getBarHeight(month.revenue) + 'px' }"
                  :title="formatCurrency(month.revenue)"
                ></div>
              </div>
              <div class="bar-label">{{ formatMonth(month.month) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Month-over-Month Comparison -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t("reports.monthOverMonth.title") }}</h3>
        </div>
        <div v-if="monthlyData.length === 0" class="no-data">
          {{ t("common.noData") }}
        </div>
        <div v-else class="table-container">
          <table class="reports-table">
            <thead>
              <tr>
                <th>{{ t("reports.monthOverMonth.month") }}</th>
                <th>{{ t("reports.monthOverMonth.orders") }}</th>
                <th>{{ t("reports.monthOverMonth.revenue") }}</th>
                <th>{{ t("reports.monthOverMonth.change") }}</th>
                <th>{{ t("reports.monthOverMonth.growthRate") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(month, index) in monthlyData" :key="month.month">
                <td>
                  <strong>{{ formatMonth(month.month) }}</strong>
                </td>
                <td>{{ month.order_count }}</td>
                <td>{{ formatCurrency(month.revenue) }}</td>
                <td>
                  <span
                    v-if="index > 0"
                    :class="
                      getChangeClass(
                        month.revenue,
                        monthlyData[index - 1].revenue,
                      )
                    "
                  >
                    {{
                      getChangeValue(
                        month.revenue,
                        monthlyData[index - 1].revenue,
                      )
                    }}
                  </span>
                  <span v-else>-</span>
                </td>
                <td>
                  <span
                    v-if="index > 0"
                    :class="
                      getChangeClass(
                        month.revenue,
                        monthlyData[index - 1].revenue,
                      )
                    "
                  >
                    {{
                      getGrowthRate(
                        month.revenue,
                        monthlyData[index - 1].revenue,
                      )
                    }}
                  </span>
                  <span v-else>-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">
            {{ t("reports.summary.totalRevenueYtd") }}
          </div>
          <div class="stat-value">{{ formatCurrency(totalRevenue) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            {{ t("reports.summary.avgMonthlyRevenue") }}
          </div>
          <div class="stat-value">{{ formatCurrency(avgMonthlyRevenue) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            {{ t("reports.summary.totalOrdersYtd") }}
          </div>
          <div class="stat-value">{{ totalOrders }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ t("reports.summary.bestQuarter") }}</div>
          <div class="stat-value">{{ bestQuarter }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "../composables/useI18n";
import { useFilters } from "../composables/useFilters";
import { api } from "../api";
import { formatCurrencyWithDecimals } from "../utils/currency";

export default {
  name: "Reports",
  setup() {
    const { t, currentCurrency } = useI18n();
    const {
      selectedLocation,
      selectedCategory,
      selectedStatus,
      getCurrentFilters,
    } = useFilters();

    const loading = ref(true);
    const error = ref(null);
    const quarterlyData = ref([]);
    const monthlyData = ref([]);
    const totalRevenue = ref(0);
    const avgMonthlyRevenue = ref(0);
    const totalOrders = ref(0);
    const bestQuarter = ref("");

    const calculateSummaryStats = () => {
      // Calculate total revenue
      var total = 0;
      for (var i = 0; i < monthlyData.value.length; i++) {
        total = total + monthlyData.value[i].revenue;
      }
      totalRevenue.value = total;

      // Calculate average monthly revenue
      if (monthlyData.value.length > 0) {
        avgMonthlyRevenue.value = total / monthlyData.value.length;
      } else {
        avgMonthlyRevenue.value = 0;
      }

      // Calculate total orders
      var orders = 0;
      for (var i = 0; i < monthlyData.value.length; i++) {
        orders = orders + monthlyData.value[i].order_count;
      }
      totalOrders.value = orders;

      // Find best quarter
      var bestQ = "";
      var bestRevenue = 0;
      for (var i = 0; i < quarterlyData.value.length; i++) {
        if (quarterlyData.value[i].total_revenue > bestRevenue) {
          bestRevenue = quarterlyData.value[i].total_revenue;
          bestQ = quarterlyData.value[i].quarter;
        }
      }
      bestQuarter.value = bestQ;
    };

    const loadData = async () => {
      try {
        loading.value = true;

        // These endpoints don't support the month/period filter (reports are
        // themselves organized by month/quarter), so only warehouse/category/
        // status from getCurrentFilters() are relevant here.
        const filters = getCurrentFilters();

        const [quarterlyResponse, monthlyResponse] = await Promise.all([
          api.getQuarterlyReports(filters),
          api.getMonthlyTrends(filters),
        ]);

        quarterlyData.value = quarterlyResponse;
        monthlyData.value = monthlyResponse;

        calculateSummaryStats();
      } catch (err) {
        error.value = t("reports.loadError", { error: err.message });
      } finally {
        loading.value = false;
      }
    };

    // Formats a dollar amount using the app's current currency (USD/JPY),
    // preserving the 2-decimal precision the old hand-rolled formatNumber()
    // produced.
    const formatCurrency = (num) => {
      return formatCurrencyWithDecimals(num, currentCurrency.value, 2);
    };

    // Translates an English month abbreviation (e.g. "Jan") to the current
    // locale, mirroring the translateMonth() pattern used in Spending.vue.
    const translateMonthAbbr = (month) => {
      var monthMap = {
        Jan: t("months.jan"),
        Feb: t("months.feb"),
        Mar: t("months.mar"),
        Apr: t("months.apr"),
        May: t("months.may"),
        Jun: t("months.jun"),
        Jul: t("months.jul"),
        Aug: t("months.aug"),
        Sep: t("months.sep"),
        Oct: t("months.oct"),
        Nov: t("months.nov"),
        Dec: t("months.dec"),
      };
      return monthMap[month] || month;
    };

    const formatMonth = (monthStr) => {
      // Convert YYYY-MM to readable format
      var parts = monthStr.split("-");
      var year = parts[0];
      var month = parts[1];

      var monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      var monthIndex = parseInt(month) - 1;

      return translateMonthAbbr(monthNames[monthIndex]) + " " + year;
    };

    // Precomputed once per monthlyData change instead of rescanning the
    // whole array on every getBarHeight() call (was O(n) per bar / O(n^2)
    // total per render).
    const maxMonthlyRevenue = computed(() => {
      var maxRevenue = 0;
      for (var i = 0; i < monthlyData.value.length; i++) {
        if (monthlyData.value[i].revenue > maxRevenue) {
          maxRevenue = monthlyData.value[i].revenue;
        }
      }
      return maxRevenue;
    });

    const getBarHeight = (revenue) => {
      // Calculate bar height (max height 200px)
      return maxMonthlyRevenue.value === 0
        ? 0
        : (revenue / maxMonthlyRevenue.value) * 200;
    };

    const getFulfillmentClass = (rate) => {
      if (rate >= 90) {
        return "badge success";
      } else if (rate >= 75) {
        return "badge warning";
      } else {
        return "badge danger";
      }
    };

    const getChangeValue = (current, previous) => {
      var change = current - previous;
      if (change > 0) {
        return "+" + formatCurrency(change);
      } else if (change < 0) {
        return "-" + formatCurrency(Math.abs(change));
      } else {
        return formatCurrency(0);
      }
    };

    const getChangeClass = (current, previous) => {
      var change = current - previous;
      if (change > 0) {
        return "positive-change";
      } else if (change < 0) {
        return "negative-change";
      } else {
        return "";
      }
    };

    const getGrowthRate = (current, previous) => {
      if (previous === 0) {
        return "N/A";
      }

      var rate = ((current - previous) / previous) * 100;
      var sign = rate > 0 ? "+" : "";

      return sign + rate.toFixed(1) + "%";
    };

    // Reload data when warehouse/category/status filters change. Time
    // Period (month) is intentionally excluded - these report endpoints
    // don't support it, same as Inventory's existing exception.
    watch([selectedLocation, selectedCategory, selectedStatus], () => {
      loadData();
    });

    onMounted(loadData);

    return {
      t,
      loading,
      error,
      quarterlyData,
      monthlyData,
      totalRevenue,
      avgMonthlyRevenue,
      totalOrders,
      bestQuarter,
      formatCurrency,
      formatMonth,
      getBarHeight,
      getFulfillmentClass,
      getChangeValue,
      getChangeClass,
      getGrowthRate,
    };
  },
};
</script>

<style scoped>
.reports {
  padding: 0;
}

.card {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-header {
  margin-bottom: 1.5rem;
}

.card-title {
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
  margin: 0;
}

.reports-table {
  width: 100%;
  border-collapse: collapse;
}

.reports-table th {
  background: var(--color-surface-alt);
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border);
}

.reports-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.reports-table tr:hover {
  background: var(--color-surface-alt);
}

.chart-container {
  padding: 2rem 1rem;
  min-height: 300px;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 250px;
  gap: 0.5rem;
}

.bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  max-width: 80px;
}

.bar-container {
  height: 200px;
  display: flex;
  align-items: flex-end;
  width: 100%;
}

.bar {
  width: 100%;
  background: linear-gradient(
    to top,
    var(--color-primary),
    var(--color-primary-hover)
  );
  border-radius: 4px 4px 0 0;
  transition: all 0.3s;
  cursor: pointer;
}

.bar:hover {
  background: linear-gradient(
    to top,
    var(--color-primary),
    var(--color-primary)
  );
}

.bar-label {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-align: center;
  transform: rotate(-45deg);
  white-space: nowrap;
  margin-top: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.stat-card {
  background: var(--color-surface);
  border-radius: 12px;
  padding: var(--space-6);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-left: 4px solid var(--color-primary);
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.badge.success {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.badge.warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.badge.danger {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.positive-change {
  color: var(--color-success);
  font-weight: 600;
}

.negative-change {
  color: var(--color-danger);
  font-weight: 600;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary);
}

.error {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.no-data {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 0.875rem;
}
</style>
