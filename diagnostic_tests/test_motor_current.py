"""
================================================================================
 CONTROLLED DIAGNOSTIC TEST — MOTOR CURRENT TEST
================================================================================
"""
import os, sys
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(CURRENT_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
from backend.diagnostic_tests.test_motor_current import run_motor_current_diagnostic_test

if __name__ == "__main__":
    run_motor_current_diagnostic_test()
