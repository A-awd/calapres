import re
import unittest


SUMMARY_LINE = re.compile(r"^(?:#|ℹ)\s+(pass|fail)\s+([0-9]+)$", re.MULTILINE)


def parse_node_test_summary(stdout: str) -> tuple[int, int]:
    counts = {name: int(value) for name, value in SUMMARY_LINE.findall(stdout)}
    if set(counts) != {"pass", "fail"}:
        raise ValueError("Node test summary is incomplete")
    return counts["pass"], counts["fail"]


class NodeTestSummaryParserTests(unittest.TestCase):
    def test_parses_legacy_and_current_node_summaries(self):
        for stdout in ("# pass 16\n# fail 0\n", "ℹ pass 16\nℹ fail 0\n"):
            self.assertEqual(parse_node_test_summary(stdout), (16, 0))


if __name__ == "__main__":
    unittest.main()
