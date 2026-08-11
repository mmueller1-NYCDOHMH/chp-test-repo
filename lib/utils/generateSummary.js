/**
 * FILE: generateSummary.js
 *
 * PURPOSE:
 * Utility function for generating accessible alt text descriptions of bar chart data.
 *
 * DESCRIPTION:
 * Accepts chart data and axis metadata, then produces a human-readable summary
 * string intended for screen readers. The summary includes the chart title, axis
 * labels, data range, and the highest and lowest values with their associated years.
 *
 * EXAMPLE:
 * Input:  { data: [{ year: 2020, value: 30 }, { year: 2021, value: 75 }, { year: 2022, value: 50 }],
 *           title: "Avoidable Hospitalizations By Year", xLabel: "Year", yLabel: "Avoidable Hospitalizations" }
 * Output: "Avoidable Hospitalizations By Year. Avoidable Hospitalizations by Year from 2020 to 2022.
 *          Highest value is 75 in 2021. Lowest value is 30 in 2020."
 *
 * RESPONSIBILITIES:
 * - Validate that data exists and is non-empty before processing
 * - Derive the time range from the first and last entries in the dataset
 * - Identify the data points with the highest and lowest values
 * - Return a complete, self-contained sentence suitable for use in aria-describedby
 * - Return an empty string if data is missing or empty, to avoid broken aria attributes
 *
 * NOTES:
 * - Assumes data is pre-sorted in chronological order; range uses index 0 and the last index
 * - Assumes each data point has a `year` and `value` field; other shapes will produce unexpected output
 * - Only flat, single-series datasets are supported; multi-series charts would need separate handling
 * - Can be extended to include average value, trend direction, or total if richer descriptions are needed
 */

export function generateSummary({
    data,
    title,
    xLabel = "Year",
    yLabel = "Value",
  }) {
    if (!data || data.length === 0) return "";
  
    const values = data.map((d) => d.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
  
    const maxItem = data.find((d) => d.value === maxValue);
    const minItem = data.find((d) => d.value === minValue);
  
    const rangeStart = data[0]?.year;
    const rangeEnd = data[data.length - 1]?.year;
  
    return `${title}. ${yLabel} by ${xLabel} from ${rangeStart} to ${rangeEnd}. Highest value is ${maxValue} in ${maxItem?.year}. Lowest value is ${minValue} in ${minItem?.year}.`;
  }