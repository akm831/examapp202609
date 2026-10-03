import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, VerificationStatus } from "@prisma/client";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const expectedSubjects: Record<string, number> = { "local-government-law":166,"local-public-service-law":216,shisei:110,"labor-standards-law":20,"municipal-regulations":100,"domestic-affairs":25 };
const expectedStatuses: Record<string, number> = { CONFIRMED:609,JUDGMENT_CONFIRMED_REASON_UNVERIFIED:10,PAST_EXAM_ONLY:12,SOURCE_UNCERTAIN:6 };
function eq(label:string, actual:number, expected:number) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); console.log(`✓ ${label}: ${actual}`); }
async function main() {
  eq("total", await prisma.studyItem.count(), 637);
  eq("reviewEligible", await prisma.studyItem.count({where:{reviewEligible:true}}), 631);
  for (const [slug,n] of Object.entries(expectedSubjects)) eq(`subject:${slug}`, await prisma.studyItem.count({where:{subject:{slug}}}), n);
  for (const [status,n] of Object.entries(expectedStatuses)) eq(`status:${status}`, await prisma.studyItem.count({where:{verificationStatus:status as VerificationStatus}}), n);
  eq("groupShared", await prisma.studyItem.count({where:{explanationType:"GROUP_SHARED"}}), 50);
  eq("amendment", await prisma.studyItem.count({where:{caution:"AMENDMENT"}}), 15);
  eq("timeSensitive", await prisma.studyItem.count({where:{timeSensitive:true}}), 2);
  eq("historical", await prisma.studyItem.count({where:{historicalJudgment:{not:null}}}), 1);
  console.log("DB GATE: PASS\n637 StudyItems verified.");
}
main().catch(e=>{console.error("DB GATE: FAIL",e);process.exitCode=1}).finally(()=>prisma.$disconnect());
