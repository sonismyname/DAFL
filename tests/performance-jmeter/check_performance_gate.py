#!/usr/bin/env python3
import csv
import sys
import os

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 check_performance_gate.py <jtl_file> [max_error_rate_pct] [max_avg_rt_ms]")
        sys.exit(1)

    jtl_file = sys.argv[1]
    max_error_rate = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0
    max_avg_rt = float(sys.argv[3]) if len(sys.argv) > 3 else 1000.0

    if not os.path.exists(jtl_file):
        print(f"❌ Error: JTL file not found at '{jtl_file}'")
        sys.exit(1)

    total_requests = 0
    error_requests = 0
    total_elapsed = 0

    with open(jtl_file, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_requests += 1
            try:
                elapsed = int(row.get('elapsed', 0))
                total_elapsed += elapsed
            except ValueError:
                pass

            success = row.get('success', 'true').strip().lower()
            if success != 'true':
                error_requests += 1

    if total_requests == 0:
        print("❌ Error: JTL file contains no test samples!")
        sys.exit(1)

    error_rate = (error_requests / total_requests) * 100.0
    avg_rt = total_elapsed / total_requests

    print("==================================================")
    print(" 📊 JMETER PERFORMANCE QUALITY GATE SUMMARY")
    print("==================================================")
    print(f" Total Requests Executed : {total_requests}")
    print(f" Failed Requests Count   : {error_requests}")
    print(f" Measured Error Rate     : {error_rate:.2f}% (Threshold: <= {max_error_rate}%)")
    print(f" Measured Avg Response   : {avg_rt:.2f} ms (Threshold: <= {max_avg_rt} ms)")
    print("==================================================")

    failed = False
    if error_rate > max_error_rate:
        print(f"❌ FAILED: Error Rate {error_rate:.2f}% exceeds allowable threshold of {max_error_rate}%!")
        failed = True
    else:
        print(f"✅ PASSED: Error Rate {error_rate:.2f}% is within acceptable limit.")

    if avg_rt > max_avg_rt:
        print(f"❌ FAILED: Average Response Time {avg_rt:.2f} ms exceeds allowable threshold of {max_avg_rt} ms!")
        failed = True
    else:
        print(f"✅ PASSED: Average Response Time {avg_rt:.2f} ms is within acceptable limit.")

    if failed:
        sys.exit(2)
    else:
        print("🎉 [Performance Quality Gate PASSED] All performance metrics met!")
        sys.exit(0)

if __name__ == '__main__':
    main()
