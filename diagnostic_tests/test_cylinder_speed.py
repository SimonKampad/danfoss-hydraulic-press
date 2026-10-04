"""
================================================================================
 CONTROLLED DIAGNOSTIC TEST — CYLINDER SPEED TEST
================================================================================
"""
import os, sys
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(CURRENT_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
from backend.diagnostic_tests.test_cylinder_speed import run_cylinder_speed_diagnostic_test

if __name__ == "__main__":
    run_cylinder_speed_diagnostic_test()
