import { answerState } from "../schedule.js";

// Kommer / Kommer inte för en familj och en träning. Tills familjen svarat visas inställningens
// förslag med streckad kant ("Ibland" har inget förslag); ett tryck sparar svaret.
export default function AnswerButtons({day,me,onAnswer,className="card-answer",label}){
  const {answered,value}=answerState(day,me);
  const cls=v=>value===v ? (answered?"active":"suggested") : "";
  return <div className={className+(!answered&&day.soon&&day.unconfirmed.includes(me)?" open":"")}>
    {label && <span>{label}</span>}
    <button className={cls(true)} onClick={()=>onAnswer(true)}>{answered&&value===true?"✓ ":""}Kommer</button>
    <button className={cls(false)} onClick={()=>onAnswer(false)}>{answered&&value===false?"✓ ":""}Kommer inte</button>
  </div>;
}
