export function courseYear(code:string=""){
  const match=String(code).match(/KM-(\d{4})-/i);
  return match?.[1]||"Year TBD";
}

export function facultyShortName(name:string=""){
  const value=String(name||"").trim();
  if(!value)return "Faculty";
  const parts=value.split(/\s+/).filter(Boolean);
  const last=parts[parts.length-1]||value;
  if(/^dr\.?$/i.test(parts[0]||""))return `Dr. ${last}`;
  return value;
}

export function courseFormatLabel(format:string=""){
  const value=String(format||"Course").trim();
  const key=value.toLowerCase().replace(/[_-]+/g," ").replace(/\s+/g," ");
  const map:Record<string,string>={
    "live seminar":"Live Seminar",
    "seminar":"Live Seminar",
    "live in person":"Live Seminar",
    "in office":"In-Office Training",
    "in office training":"In-Office Training",
    "live in office":"In-Office Training",
    "live webinar":"Live Webinar",
    "webinar":"Live Webinar",
    "online":"Online Course",
    "online / on demand":"Online Course",
    "on demand":"Online Course",
    "hybrid":"Hybrid Course",
    "legacy":"Legacy Course"
  };
  return map[key]||value.replace(/\b\w/g,c=>c.toUpperCase());
}

export function courseDisplayLabel(course:any){
  if(!course)return "Course";
  const faculty=facultyShortName(course.faculty_name||course.public_name||"");
  const year=courseYear(course.course_code||"");
  const format=courseFormatLabel(course.course_format||"Course");
  if(faculty!=="Faculty")return `${faculty} · ${year} · ${format}`;
  return String(course.working_name||course.title||course.course_code||"Course");
}
