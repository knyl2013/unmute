<script lang="ts">
    // Define the type for a single report entry
    type ReportEntry = {
        date: string;
        overallScore: number;
    };

    export let data: ReportEntry[] = [];

    // The data comes sorted newest-to-oldest. For plotting left-to-right, we need oldest-to-newest.
    $: plotData = [...data].reverse();

    // SVG dimensions and padding
    const width = 500;
    const height = 180;
    const padding = { top: 20, right: 10, bottom: 30, left: 25 };
    const yAxisMax = 9; // IELTS max score

    // Calculate the points for the line graph
    $: points = plotData
        .map((d, i) => {
            // X position is evenly spaced
            const x = padding.left + (i * (width - padding.left - padding.right)) / (plotData.length - 1 || 1);
            // Y position is based on score (inverted because SVG Y-axis is top-to-bottom)
            const y = height - padding.bottom - ((d.overallScore / yAxisMax) * (height - padding.top - padding.bottom));
            return `${x},${y}`;
        })
        .join(' ');
</script>

<div class="chartWrapper">
    <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" aria-label="Score progression chart">
        <!-- Y-Axis labels and grid lines -->
        {#each [3, 6, 9] as score}
            {@const y = height - padding.bottom - (score / yAxisMax) * (height - padding.top - padding.bottom)}
            <g class="grid">
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} />
                <text x={padding.left - 8} y={y + 4} class="axisLabel">{score}</text>
            </g>
        {/each}
        
        <!-- X-Axis Line -->
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} class="axisLine" />

        <!-- Data Line -->
        {#if points}
            <polyline class="dataLine" points={points} />
        {/if}

        <!-- Data Points and Date Labels -->
        {#each plotData as d, i}
            {@const x = padding.left + (i * (width - padding.left - padding.right)) / (plotData.length - 1 || 1)}
            {@const y = height - padding.bottom - ((d.overallScore / yAxisMax) * (height - padding.top - padding.bottom))}
            
            <!-- Point circle -->
            <circle cx={x} cy={y} r="4" class="dataPoint" />
            
            <!-- Date label on X-axis -->
            <text x={x} y={height - padding.bottom + 15} class="axisLabel dateLabel">
                {new Date(d.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
            </text>
        {/each}
    </svg>
</div>

<style>
    .chartWrapper {
        width: 100%;
        height: auto;
    }
    svg {
        display: block;
        width: 100%;
    }
    .grid line {
        stroke: rgba(255, 255, 255, 0.1);
        stroke-width: 1;
        stroke-dasharray: 2, 3;
    }
    .axisLine {
        stroke: rgba(255, 255, 255, 0.2);
        stroke-width: 1;
    }
    .axisLabel {
        font-size: 10px;
        fill: #c7c7cc;
        text-anchor: middle;
    }
    .dateLabel {
        font-size: 9px;
    }
    .dataLine {
        fill: none;
        stroke: #34c759;
        stroke-width: 2.5;
        stroke-linecap: round;
        stroke-linejoin: round;
    }
    .dataPoint {
        fill: #ffffff;
        stroke: #34c759;
        stroke-width: 2;
    }
</style>