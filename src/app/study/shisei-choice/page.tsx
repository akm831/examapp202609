import {redirect} from "next/navigation";
import {requireUser} from "@/server/auth";
import {ChoicePracticeScreen} from "@/components/choice-practice-screen";
import type {ChoiceQuestion} from "@/lib/choice-practice";
import payload from "../../../../data/shisei_choice_questions.json";

export default async function Page() {
  let user;try {user=await requireUser()}catch {redirect("/auth")}
  return <ChoicePracticeScreen questions={payload.questions as ChoiceQuestion[]} userId={user.id}/>;
}
