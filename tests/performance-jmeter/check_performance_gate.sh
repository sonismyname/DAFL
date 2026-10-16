#!/bin/sh
set -e

JTL_FILE="${1:-results/result.jtl}"
MAX_ERR_RATE="${2:-2.0}"
MAX_AVG_RT="${3:-1000.0}"

if [ ! -f "$JTL_FILE" ]; then
    echo "❌ Error: File '$JTL_FILE' not found!"
    exit 1
fi

awk -F',' -v max_err="$MAX_ERR_RATE" -v max_rt="$MAX_AVG_RT" '
NR == 1 {
    for (i = 1; i <= NF; i++) {
        if ($i == "elapsed") col_elapsed = i;
        if ($i == "success") col_success = i;
    }
}
NR > 1 {
    total++;
    elapsed_total += $col_elapsed;
    if (tolower($col_success) != "true") {
        errors++;
    }
}
END {
    if (total == 0) {
        print "❌ Error: JTL file has no sample records!";
        exit 1;
    }
    err_rate = (errors / total) * 100.0;
    avg_rt = elapsed_total / total;

    print "==================================================";
    print " 📊 JMETER PERFORMANCE QUALITY GATE SUMMARY";
    print "==================================================";
    printf " Total Requests Executed : %d\n", total;
    printf " Failed Requests Count   : %d\n", errors;
    printf " Measured Error Rate     : %.2f%% (Threshold: <= %.2f%%)\n", err_rate, max_err;
    printf " Measured Avg Response   : %.2f ms (Threshold: <= %.2f ms)\n", avg_rt, max_rt;
    print "==================================================";

    failed = 0;
    if (err_rate > max_err) {
        printf "❌ FAILED: Error Rate %.2f%% exceeds threshold %.2f%%!\n", err_rate, max_err;
        failed = 1;
    } else {
        printf "✅ PASSED: Error Rate %.2f%% is within limit.\n", err_rate;
    }

    if (avg_rt > max_rt) {
        printf "❌ FAILED: Avg Response Time %.2f ms exceeds threshold %.2f ms!\n", avg_rt, max_rt;
        failed = 1;
    } else {
        printf "✅ PASSED: Avg Response Time %.2f ms is within limit.\n", avg_rt;
    }

    if (failed == 1) {
        print "❌ [Performance Quality Gate FAILED]";
        exit 2;
    } else {
        print "🎉 [Performance Quality Gate PASSED] All metrics satisfied!";
        exit 0;
    }
}' "$JTL_FILE"
