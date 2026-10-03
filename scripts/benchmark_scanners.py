"""
AISecGuard — Scanner Performance Benchmark (Week 4)
Measures scan times for:
  - Small dataset
  - Medium dataset
  - Dependency scan
  - Model metadata scan
"""

import time
import tempfile
import sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(ROOT_DIR / "backend"))

from scanners.dataset_scanner import scan_dataset_file
from scanners.dependency_scanner import scan_dependency_file
from scanners.model_scanner import scan_model_file

FIXTURES_DIR = Path(__file__).parent.parent / "tests" / "fixtures"


def benchmark():
    results = {}

    # 1. Dependency scan time
    req_file = FIXTURES_DIR / "requirements_unpinned.txt"
    t0 = time.perf_counter()
    res_dep = scan_dependency_file(req_file)
    t_dep = (time.perf_counter() - t0) * 1000
    results["Dependency Scanner (requirements.txt)"] = f"{t_dep:.2f} ms"

    # 2. Model metadata scan time
    model_file = FIXTURES_DIR / "sample_model.safetensors"
    t0 = time.perf_counter()
    res_mod = scan_model_file(model_file)
    t_mod = (time.perf_counter() - t0) * 1000
    results["Model Scanner (safetensors)"] = f"{t_mod:.2f} ms"

    # 3. Small dataset scan time (10 rows)
    small_ds = FIXTURES_DIR / "dataset_clean.csv"
    t0 = time.perf_counter()
    res_s = scan_dataset_file(small_ds)
    t_small = (time.perf_counter() - t0) * 1000
    results["Small Dataset Scanner (10 rows)"] = f"{t_small:.2f} ms"

    # 4. Medium dataset scan time (1,000 rows)
    with tempfile.NamedTemporaryFile(suffix=".csv", mode="w", delete=False) as f:
        f.write("id,feature1,feature2,label\n")
        for i in range(1000):
            f.write(f"{i},{i*0.5},{i*1.2},class_{i%3}\n")
        med_path = Path(f.name)

    try:
        t0 = time.perf_counter()
        res_m = scan_dataset_file(med_path)
        t_med = (time.perf_counter() - t0) * 1000
        results["Medium Dataset Scanner (1,000 rows)"] = f"{t_med:.2f} ms"
    finally:
        med_path.unlink(missing_ok=True)

    print("=== AISecGuard Scanner Performance Benchmark ===")
    for k, v in results.items():
        print(f"  {k:45}: {v}")


if __name__ == "__main__":
    benchmark()
