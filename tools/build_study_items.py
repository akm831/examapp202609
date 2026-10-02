#!/usr/bin/env python3
"""Build the audited, immutable StudyItem seed from the six source texts."""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
import uuid
from collections import Counter
from pathlib import Path
from study_context import enrich_context
from shisei_rewrites import apply_shisei_rewrites

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "sources"
OUT = ROOT / "data"
NS = uuid.UUID("b7112c40-371f-5fa1-a0b4-a28952ee38a5")

FILES = {
    "local-government-law": "local_government_law_integrated_review_text (1)(1).md",
    "local-public-service-law": "local_public_service_law_integrated_review_text(1).md",
    "shisei": "shisei_integrated_review_text(1).md",
    "labor-standards-law": "labor_standards_law_integrated_review_text(1).md",
    "municipal-regulations": "municipal_regulations_integrated_review_text(1).md",
    "domestic-affairs": "domestic_affairs_r8_integrated_review_text(1).md",
}
SUBJECTS = {
    "local-government-law": "地方自治法", "local-public-service-law": "地方公務員法",
    "shisei": "市政知識", "labor-standards-law": "労働基準法",
    "municipal-regulations": "市例規", "domestic-affairs": "国内情勢",
}
EXPECTED = {"local-government-law": 146, "local-public-service-law": 192, "shisei": 110,
            "labor-standards-law": 20, "municipal-regulations": 100, "domestic-affairs": 25}


def lines(slug):
    return (SRC / FILES[slug]).read_text(encoding="utf-8").splitlines()


def clean_heading(s):
    return re.sub(r"^#+\s*", "", s).strip()


def keyify(s):
    s = unicodedata.normalize("NFKC", s).lower()
    s = re.sub(r"[^a-z0-9一-龥ぁ-んァ-ン]+", "-", s).strip("-")
    return s[:70]


def numbered_block(ls, start):
    out = []
    i = start
    expected = 1
    while i < len(ls):
        m = re.match(r"^(\d+)[\.．、)]\s*(.+)$", ls[i])
        if not m or int(m.group(1)) != expected:
            break
        out.append((expected, m.group(2).strip(), i + 1))
        expected += 1
        i += 1
    return out


def preceding_heading(ls, idx):
    for i in range(idx - 1, -1, -1):
        if ls[i].startswith("#"):
            return clean_heading(ls[i]), i
    return "", 0


def explanation_after(ls, after, item_no=None):
    """Return only source text; never synthesize an explanation."""
    end = len(ls)
    for i in range(after, len(ls)):
        if ls[i].startswith("## ") and i > after:
            end = i
            break
    if item_no is not None:
        patterns = [rf"^-\s*\*\*{item_no}\s*[○×]", rf"^-\s*{item_no}\s*[○×]", rf"^{item_no}[\.．]\s*\*\*", rf"^{item_no}[\.．]\s*[○×]"]
        for i in range(after, end):
            if any(re.match(p, ls[i]) for p in patterns):
                return re.sub(rf"^(?:-\s*)?{item_no}[\.．]?\s*", "", ls[i]).strip(), i + 1
    return None, None


def base_item(slug, group_key, group_heading, n, statement, line, judgment, explanation,
              explanation_type="ITEM_SPECIFIC", source_type="PREDICTED", item_type="TRUE_FALSE"):
    source_key = f"{slug}:{group_key}:{n}"
    return {
        "id": str(uuid.uuid5(NS, source_key)), "sourceItemKey": source_key,
        "subject": SUBJECTS[slug], "questionGroup": group_key, "sourceType": source_type,
        "itemType": item_type, "statement": statement, "correctJudgment": judgment,
        "judgmentSource": "SOURCE_EXPLICIT", "explanation": explanation,
        "explanationType": explanation_type, "sourceReference": f"{FILES[slug]}:{line}",
        "verificationStatus": "CONFIRMED", "reviewEligible": True,
        "judgmentAsOf": "2026-04-01", "historicalJudgment": None, "historicalContext": None,
        "timeSensitive": False, "caution": None, "sourceDocument": FILES[slug],
        "sourceQuestionNumber": group_key, "sourceItemNumber": n,
        "sourceHeading": group_heading, "sourceOrder": 0,
        "sourceMetadata": {"statementLine": line}, "active": True,
    }


def choice_subject(slug, heading_rx, shared_groups=frozenset(), amendment=frozenset()):
    ls = lines(slug); items = []
    for i, line in enumerate(ls):
        if not re.match(r"^1[\.．、)]\s", line): continue
        block = numbered_block(ls, i)
        heading, hidx = preceding_heading(ls, i)
        hm = re.search(heading_rx, heading)
        if not hm and slug == "labor-standards-law":
            for k in range(i - 1, -1, -1):
                if ls[k].startswith("#") and re.search(heading_rx, clean_heading(ls[k])):
                    heading, hidx = clean_heading(ls[k]), k; hm = re.search(heading_rx, heading); break
        if not hm or len(block) != 5: continue
        if slug == "shisei" and heading == "都市計画横断問題":
            group_num, group = 22, "urban-planning-cross"
        else:
            group_num = int(hm.group(1)); group = f"q{group_num:02d}"
        boundary = next((j for j in range(i + 5, len(ls)) if ls[j].startswith("## ")), len(ls))
        segment = "\n".join(ls[i + 5:boundary])
        ans = re.search(r"\*\*(?:正答|正解)[：:]\s*(\d+)\*\*", segment)
        if not ans:
            ans = re.search(r"#{3}\s*正答\s*\n\*\*(\d+)\*\*", segment)
        if not ans: raise ValueError(f"answer missing: {slug} {heading}")
        correct = int(ans.group(1))
        shared = group_num in shared_groups
        shared_text = None
        if shared:
            marker = next((j for j in range(i + 5, boundary) if re.match(r"^#{3,4}\s*(?:全肢)?解説", ls[j])), None)
            if marker is not None:
                shared_text = "\n".join(x for x in ls[marker + 1:boundary] if x.strip() and x.strip() != "---").strip()
        for n, statement, ln in block:
            expl, eline = (shared_text, None) if shared else explanation_after(ls, i + 5, n)
            it = base_item(slug, group, heading, n, statement, ln, n == correct, expl,
                           "GROUP_SHARED" if shared else "ITEM_SPECIFIC")
            if eline: it["sourceMetadata"]["explanationLine"] = eline
            if group_num in amendment: it["caution"] = "AMENDMENT"
            if slug == "domestic-affairs" and (group_num, n) in {(1, 2), (3, 2)}: it["timeSensitive"] = True
            items.append(it)
    return items


def marked_subject(slug):
    ls = lines(slug); items = []
    for i, line in enumerate(ls):
        if not re.match(r"^1[\.．、)]\s", line): continue
        block = numbered_block(ls, i); heading, _ = preceding_heading(ls, i)
        if "解説" in heading or "整理" in heading or len(block) > 5: continue
        if not any(x in heading for x in ("標準問題", "補完問題", "応用問題", "行政実例補完")): continue
        # The following numbered block under an explanation heading carries the source judgments.
        j = i + len(block)
        while j < len(ls) and not re.match(r"^1[\.．、)]\s", ls[j]):
            if ls[j].startswith("## ") and j > i + len(block): break
            j += 1
        expl_block = numbered_block(ls, j) if j < len(ls) else []
        if len(expl_block) != len(block):
            # R1 historical/current block is still a five-row explanation block.
            continue
        group = keyify(heading)
        source_type = "PAST_EXAM" if "実過去問" in heading else ("ADMINISTRATIVE_PRECEDENT" if "行政実例" in heading else "STANDARD")
        for (n, statement, ln), (_, expl, eln) in zip(block, expl_block):
            marker = re.search(r"\*\*(○|×|正しい|誤り|出題当時：×／2026-04-01：○)", expl)
            if not marker: raise ValueError(f"judgment missing {slug}:{ln}")
            token = marker.group(1); judgment = token in ("○", "正しい", "出題当時：×／2026-04-01：○")
            it = base_item(slug, group, heading, n, statement, ln, judgment, expl, source_type=source_type)
            it["sourceMetadata"]["explanationLine"] = eln
            if "出題当時：×" in expl:
                it.update(judgmentSource="CURRENT_VS_HISTORICAL", historicalJudgment=False,
                          historicalContext="R1出題当時")
            items.append(it)
    # Local-government R1 fund is a one-line problem without a numbered list.
    if slug == "local-government-law":
        for i, line in enumerate(ls):
            if line.startswith("**R1 問3・肢5**"):
                heading, _ = preceding_heading(ls, i); group = keyify(heading)
                statement = re.sub(r"^\*\*R1 問3・肢5\*\*\s*", "", line)
                expl = next(x for x in ls[i+1:i+8] if "**○。**" in x)
                items.append(base_item(slug, group, heading, 1, statement, i+1, True, expl, source_type="PAST_EXAM"))
    # Local-public-service H11 is an unnumbered single item.
    if slug == "local-public-service-law":
        for i, line in enumerate(ls):
            if line.startswith("**H11**"):
                heading, _ = preceding_heading(ls, i); statement = re.sub(r"^\*\*H11\*\*\s*", "", line)
                expl = next(x for x in ls[i+1:i+8] if x.startswith("**×**"))
                items.append(base_item(slug, keyify(heading), heading, 1, statement, i+1, False, expl, source_type="PAST_EXAM"))
    return items


def labor_items():
    items = choice_subject("labor-standards-law", r"問(\d+)")
    ls = lines("labor-standards-law")
    specs = [
        ("past-h6-working-hours", "休憩時間を含めて1週間40時間", False, 139),
        ("past-h7-holidays", "毎週少なくとも2回の休日が必要", False, 158),
        ("past-h9-holidays", "4週間を通じ4日以上の休日を与える例外", True, 159),
        ("past-h9-deep-night", "午後10時から午前5時までの深夜労働について20％以上の割増賃金", False, 177),
        ("past-h6-paid-leave", "6か月継続勤務＋全労働日の8割以上出勤→10労働日の年次有給休暇", True, 194),
    ]
    for group, statement, judgment, ln in specs:
        source_line = ls[ln-1]
        items.append(base_item("labor-standards-law", group, "実過去問で問われたポイント", 1,
                               statement, ln, judgment, source_line, source_type="PAST_EXAM"))
    return items


def apply_statuses(items):
    # The source explicitly labels these six judgments as uncertain.
    # Twelve items are retained solely as past-exam review; identify the audited groups/items.
    past_rules = [
        ("r3-任用-欠格等", {2,3,4}), ("r1-条件付採用-臨時的任用", {3}),
        ("給与該当性の具体例", {1,2,3}), ("職務専念義務-政治的行為", {1,2,3,4}),
        ("停職中の取扱い", {1}),
    ]
    reason_unverified_lg_groups = {"応用問題-札幌市実過去問-r3-契約-公式公開問題"}
    for it in items:
        if it["subject"] == "地方公務員法":
            uncertain = (("r3-任用-欠格等" in it["questionGroup"] and it["sourceItemNumber"] == 1) or
                         ("r2-争議行為" in it["questionGroup"] and it["sourceItemNumber"] == 1) or
                         ("r2-研修" in it["questionGroup"] and it["sourceItemNumber"] in {1,2,5}) or
                         ("r2-不利益処分に関する審査請求" in it["questionGroup"] and it["sourceItemNumber"] == 1))
            if uncertain:
                it["verificationStatus"] = "SOURCE_UNCERTAIN"; it["reviewEligible"] = False
            for frag, nums in past_rules:
                if frag in it["questionGroup"] and it["sourceItemNumber"] in nums:
                    it["verificationStatus"] = "PAST_EXAM_ONLY"
            if "行政実例補完6" in it["sourceHeading"] and it["sourceItemNumber"] in {3,4}:
                it["verificationStatus"] = "JUDGMENT_CONFIRMED_REASON_UNVERIFIED"
        if it["subject"] == "地方自治法" and it["questionGroup"] in reason_unverified_lg_groups:
            # R3 contract: source marks items 1,2,3,5 as 要確認; audited total includes 8 across LG.
            if "【要確認】" in (it["explanation"] or ""):
                it["verificationStatus"] = "JUDGMENT_CONFIRMED_REASON_UNVERIFIED"
    # Remaining LG labels are source-explicit 【要確認】 annotations.
    for it in items:
        if it["subject"] == "地方自治法" and "【要確認】" in (it["explanation"] or ""):
            it["verificationStatus"] = "JUDGMENT_CONFIRMED_REASON_UNVERIFIED"


def normalized(s):
    return re.sub(r"[\s、。,.・「」『』（）()]+", "", unicodedata.normalize("NFKC", s))


def main():
    items = []
    items += marked_subject("local-government-law")
    items += marked_subject("local-public-service-law")
    items += choice_subject("shisei", r"(?:確認問題|総合問題)(\d+)|(都市計画横断問題)")
    items += labor_items()
    items += choice_subject("municipal-regulations", r"Q(\d+)",
                            frozenset({2,3,7,8,10,11,12,14,15,18}), frozenset({6,8,12}))
    items += choice_subject("domestic-affairs", r"問(\d+)")
    apply_statuses(items)
    contexts = enrich_context(items, lines)
    rewrites = apply_shisei_rewrites(items, contexts)
    order = Counter()
    for it in items:
        order[it["subject"]] += 1; it["sourceOrder"] = order[it["subject"]]
    items.sort(key=lambda x: (list(SUBJECTS.values()).index(x["subject"]), x["sourceOrder"]))
    OUT.mkdir(exist_ok=True)
    (OUT / 'shisei_rewrites.json').write_text(json.dumps(rewrites, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (OUT / "study_contexts.json").write_text(json.dumps(contexts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "study_items.json").write_text(json.dumps({
        "schemaVersion": "1.0.0", "generatedFrom": "six read-only project source documents",
        "itemCount": len(items), "items": items}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts = Counter(it["subject"] for it in items); statuses = Counter(it["verificationStatus"] for it in items)
    duplicates = len(items) - len({normalized(it["statement"]) for it in items})
    report = {"itemCount": len(items), "bySubject": counts, "byVerificationStatus": statuses,
              "reviewEligible": Counter(str(it["reviewEligible"]).lower() for it in items),
              "explanationType": Counter(it["explanationType"] for it in items),
              "amendmentItems": sum(it["caution"] == "AMENDMENT" for it in items),
              "timeSensitiveItems": sum(it["timeSensitive"] for it in items),
              "normalizedStatementDuplicates": duplicates,
              "sourceItemKeyUnique": len({it["sourceItemKey"] for it in items}) == len(items)}
    (OUT / "extraction_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    assert len(items) == 593, len(items)
    assert counts == Counter({SUBJECTS[k]: v for k,v in EXPECTED.items()}), counts
    assert statuses == Counter({"CONFIRMED":565,"JUDGMENT_CONFIRMED_REASON_UNVERIFIED":10,"PAST_EXAM_ONLY":12,"SOURCE_UNCERTAIN":6}), statuses
    assert report["sourceItemKeyUnique"] and duplicates == 0
    assert report["amendmentItems"] == 15 and report["timeSensitiveItems"] == 2
    assert sum(it["explanationType"] == "GROUP_SHARED" for it in items) == 50
    assert all(it["statement"] and isinstance(it["correctJudgment"], bool) for it in items)


if __name__ == "__main__": main()
