from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("labtool", ROOT / "tools" / "labtool.py")
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Unable to load tools/labtool.py")
labtool = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = labtool
SPEC.loader.exec_module(labtool)


class LabToolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.tickets = labtool.read_csv(ROOT / "data" / "tickets.csv")
        cls.metrics = labtool.calculate_metrics(cls.tickets)

    def test_acceptance_metrics_are_derived_from_ticket_data(self) -> None:
        self.assertEqual(self.metrics["ticket_count"], 40)
        self.assertEqual(self.metrics["first_contact_resolutions"], 26)
        self.assertEqual(self.metrics["first_contact_resolution_percent"], 65.0)
        self.assertEqual(self.metrics["escalations"], 8)
        self.assertEqual(self.metrics["sla_compliant"], 37)
        self.assertEqual(self.metrics["sla_compliance_percent"], 92.5)

    def test_only_intentional_tickets_miss_sla(self) -> None:
        missed = {row["ticket_id"] for row in self.metrics["missed_sla_tickets"]}
        self.assertEqual(missed, {"INC019", "INC033", "INC038"})

    def test_ticket_ids_are_contiguous(self) -> None:
        actual = {ticket["ticket_id"] for ticket in self.tickets}
        expected = {f"INC{number:03d}" for number in range(1, 41)}
        self.assertEqual(actual, expected)

    def test_all_ticket_timestamps_are_ordered(self) -> None:
        for ticket in self.tickets:
            with self.subTest(ticket=ticket["ticket_id"]):
                opened = labtool.parse_utc(ticket["opened_at"])
                responded = labtool.parse_utc(ticket["first_response_at"])
                resolved = labtool.parse_utc(ticket["resolved_at"])
                self.assertLessEqual(opened, responded)
                self.assertLessEqual(responded, resolved)

    def test_full_repository_validation_passes(self) -> None:
        self.assertEqual(labtool.validate(), [])


if __name__ == "__main__":
    unittest.main()
