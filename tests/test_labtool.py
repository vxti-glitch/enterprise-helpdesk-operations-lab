from __future__ import annotations

import importlib.util
import sys
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("labtool", ROOT / "tools" / "labtool.py")
assert SPEC and SPEC.loader
labtool = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = labtool
SPEC.loader.exec_module(labtool)


class LabToolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        errors: list[str] = []
        cls.data = labtool.read_lab_data(errors)
        assert not errors, errors
        cls.models = labtool.event_models(
            cls.data["tickets"],
            cls.data["events"],
            labtool.index_by(cls.data["sla_targets"], "priority"),
            errors,
        )
        assert not errors, errors
        cls.metrics = labtool.calculate_metrics(cls.data["tickets"], cls.models)

    def test_full_repository_validation_and_strict_baseline_pass(self) -> None:
        self.assertEqual(labtool.validate(), [])
        self.assertEqual(labtool.validate(strict_baseline=True), [])

    def test_metrics_are_derived_from_event_history(self) -> None:
        self.assertEqual(self.metrics["ticket_count"], 40)
        self.assertEqual(self.metrics["first_contact_resolutions"], 26)
        self.assertEqual(self.metrics["escalations"], 8)
        self.assertEqual(self.metrics["sla_compliant"], 37)
        self.assertEqual(
            {row["ticket_id"] for row in self.metrics["missed_sla_tickets"]},
            {"INC019", "INC033", "INC038"},
        )
        self.assertTrue(self.models["INC009"]["escalated"])
        self.assertFalse(self.models["INC009"]["first_contact_resolution"])

    def test_requests_have_proper_identifiers_and_task_relationships(self) -> None:
        requests = [
            ticket for ticket in self.data["tickets"] if ticket["type"] == "Service Request"
        ]
        self.assertEqual(len(requests), 6)
        self.assertTrue(all(ticket["ticket_id"].startswith("REQ") for ticket in requests))
        self.assertTrue(all(ticket["legacy_id"].startswith("INC") for ticket in requests))
        request_ids = {item["request_id"] for item in self.data["request_items"]}
        task_item_ids = {task["request_item_id"] for task in self.data["request_tasks"]}
        self.assertEqual({ticket["ticket_id"] for ticket in requests}, request_ids)
        self.assertTrue(task_item_ids)

    def test_event_timeline_order_is_enforced_without_traceback(self) -> None:
        events = deepcopy(self.data["events"])
        target = next(
            event
            for event in events
            if event["ticket_id"] == "INC009" and event["event_type"] == "Resolved"
        )
        target["occurred_at"] = "2026-07-01T00:00:00Z"
        errors: list[str] = []
        labtool.event_models(
            self.data["tickets"],
            events,
            labtool.index_by(self.data["sla_targets"], "priority"),
            errors,
        )
        self.assertTrue(any("event timeline" in error for error in errors))

    def test_malformed_csv_returns_field_errors(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "bad.csv"
            path.write_text("ticket_id,summary\nINC001,Example\n", encoding="utf-8")
            errors: list[str] = []
            rows = labtool.read_csv(path, ("ticket_id", "summary", "priority"), errors)
        self.assertEqual(rows, [])
        self.assertEqual(len(errors), 1)
        self.assertIn("missing columns: priority", errors[0])

    def test_evidence_traversal_is_rejected(self) -> None:
        errors: list[str] = []
        labtool.validate_evidence_path("INC001", "../../outside.txt", errors)
        self.assertEqual(len(errors), 1)
        self.assertIn("must be a repository-relative path", errors[0])

    def test_generator_refuses_output_outside_allowed_directories(self) -> None:
        with self.assertRaises(labtool.LabDataError):
            labtool.write_atomic({ROOT.parent / "escape.md": "not allowed"})

    def test_generated_console_payload_is_complete_and_related(self) -> None:
        payload = labtool.console_payload(self.data, self.models, self.metrics)
        self.assertEqual(len(payload["tickets"]), 40)
        self.assertEqual(len(payload["assets"]), 20)
        self.assertEqual(len(payload["kb"]), 12)
        asset = next(item for item in payload["assets"] if item["asset_id"] == "NS-LT-005")
        self.assertEqual(len(asset["related_ticket_ids"]), 4)


if __name__ == "__main__":
    unittest.main()
