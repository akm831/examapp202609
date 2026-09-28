import { PrismaClient, VerificationStatus } from "@prisma/client";
import payload from "../data/study_items.json";

const prisma = new PrismaClient();
const SUBJECTS = [
  ["local-government-law", "地方自治法", 1],
  ["local-public-service-law", "地方公務員法", 2],
  ["shisei", "市政知識", 3],
  ["labor-standards-law", "労働基準法", 4],
  ["municipal-regulations", "市例規", 5],
  ["domestic-affairs", "国内情勢", 6],
] as const;

function slugFor(key: string) { return key.split(":", 1)[0]; }

async function main() {
  if (payload.schemaVersion !== "1.0.0" || payload.itemCount !== 593 || payload.items.length !== 593) throw new Error("Unsupported or incomplete study master");
  const subjectIds = new Map<string, string>();
  for (const [slug, name, sortOrder] of SUBJECTS) {
    const subject = await prisma.subject.upsert({ where: { slug }, create: { slug, name, sortOrder }, update: { name, sortOrder } });
    subjectIds.set(slug, subject.id);
  }
  for (const item of payload.items) {
    const subjectId = subjectIds.get(slugFor(item.sourceItemKey));
    if (!subjectId) throw new Error(`Unknown subject: ${item.sourceItemKey}`);
    const data = {
      subjectId, questionGroup: item.questionGroup, sourceType: item.sourceType, itemType: item.itemType,
      statementText: item.statement, correctJudgment: item.correctJudgment, judgmentSource: item.judgmentSource,
      explanation: item.explanation, explanationType: item.explanationType, sourceReference: item.sourceReference,
      verificationStatus: item.verificationStatus as VerificationStatus, reviewEligible: item.reviewEligible,
      judgmentAsOf: item.judgmentAsOf ? new Date(`${item.judgmentAsOf}T00:00:00.000Z`) : null,
      historicalJudgment: item.historicalJudgment, historicalContext: item.historicalContext,
      timeSensitive: item.timeSensitive, caution: item.caution, sourceDocument: item.sourceDocument,
      sourceQuestionNumber: item.sourceQuestionNumber, sourceItemNumber: item.sourceItemNumber,
      sourceHeading: item.sourceHeading, sourceOrder: item.sourceOrder, metadata: item.sourceMetadata,
      active: item.active,
    };
    await prisma.studyItem.upsert({ where: { sourceItemKey: item.sourceItemKey }, create: { id: item.id, sourceItemKey: item.sourceItemKey, ...data }, update: data });
  }
  console.log("Seed complete: 593 StudyItems");
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
