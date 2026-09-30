import {courseDisplayLabel} from "./course-labels";

export type CourseLabelRow={
  course_code:string;
  working_name?:string|null;
  title?:string|null;
  course_format?:string|null;
  faculty_name?:string|null;
};

export function replaceCourseCodes(text:unknown,courses:CourseLabelRow[]){
  let value=String(text??"");
  if(!value)return value;
  for(const course of courses){
    const code=String(course.course_code||"").trim();
    if(!code)continue;
    value=value.split(code).join(courseDisplayLabel(course));
  }
  return value;
}

export function labelAgentTask<T extends Record<string,any>>(task:T,courses:CourseLabelRow[]):T&{system_course_ids:string[]}{
  const haystack=`${task.title||""} ${task.instruction||""}`;
  const system_course_ids=courses.filter(course=>Boolean(course.course_code)&&haystack.includes(course.course_code)).map(course=>course.course_code);
  return {...task,title:replaceCourseCodes(task.title,courses),instruction:replaceCourseCodes(task.instruction,courses),system_course_ids};
}
