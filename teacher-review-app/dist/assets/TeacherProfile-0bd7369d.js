import{j as e,u as k,r as p,L as b}from"./index-9421cb2d.js";import{b as B,s as y,a as w}from"./api-5fb399bc.js";const d=({rating:l,maxRating:t=5,readOnly:m=!1,onRate:s})=>{const g=Math.round(l),N=h=>{m||!s||s(h)},j=(h,o)=>{};return e.jsx("div",{className:`star-rating ${m?"read-only":"interactive"}`,children:[...Array(t)].map((h,o)=>{const f=o+1;return e.jsx("span",{className:`star ${f<=g?"filled":"empty"}`,onClick:()=>N(f),onMouseEnter:u=>j(),children:"★"},o)})})},T=({reviews:l})=>{const t=s=>new Date(s).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),m=s=>{switch(s){case"positive":return e.jsx("span",{className:"bg-green-100 text-green-800 py-1 px-2 rounded-full text-sm",children:"👍 Positive"});case"negative":return e.jsx("span",{className:"bg-red-100 text-red-800 py-1 px-2 rounded-full text-sm",children:"👎 Negative"});default:return e.jsx("span",{className:"bg-yellow-100 text-yellow-800 py-1 px-2 rounded-full text-sm",children:"⚠️ Neutral"})}};return e.jsx("div",{className:"space-y-4",children:l.map(s=>e.jsxs("div",{className:"card",children:[e.jsxs("div",{className:"mb-3 flex justify-between items-center",children:[e.jsx("div",{className:"flex items-center",children:e.jsxs("div",{className:"text-sm text-gray-600",children:[s.studentName||"Anonymous Student"," • ",t(s.createdAt)]})}),e.jsx("div",{children:m(s.sentiment)})]}),e.jsx("p",{className:"text-gray-700 mb-4",children:s.comment}),s.metrics&&e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-gray-100",children:[e.jsxs("div",{className:"flex justify-between items-center",children:[e.jsx("span",{className:"text-sm text-gray-600",children:"Overall Grade"}),e.jsxs("div",{className:"flex items-center",children:[e.jsx(d,{rating:s.metrics.overallGrade,maxRating:5,readOnly:!0}),e.jsx("span",{className:"ml-1 text-sm",children:s.metrics.overallGrade})]})]}),e.jsxs("div",{className:"flex justify-between items-center",children:[e.jsx("span",{className:"text-sm text-gray-600",children:"Teaching Quality"}),e.jsxs("div",{className:"flex items-center",children:[e.jsx(d,{rating:s.metrics.teachingQuality,maxRating:5,readOnly:!0}),e.jsx("span",{className:"ml-1 text-sm",children:s.metrics.teachingQuality})]})]}),e.jsxs("div",{className:"flex justify-between items-center",children:[e.jsx("span",{className:"text-sm text-gray-600",children:"Attendance & Support"}),e.jsxs("div",{className:"flex items-center",children:[e.jsx(d,{rating:s.metrics.attendanceSupport,maxRating:5,readOnly:!0}),e.jsx("span",{className:"ml-1 text-sm",children:s.metrics.attendanceSupport})]})]}),e.jsxs("div",{className:"flex justify-between items-center",children:[e.jsx("span",{className:"text-sm text-gray-600",children:"Professional Behavior"}),e.jsxs("div",{className:"flex items-center",children:[e.jsx(d,{rating:s.metrics.professionalBehavior,maxRating:5,readOnly:!0}),e.jsx("span",{className:"ml-1 text-sm",children:s.metrics.professionalBehavior})]})]})]})]},s.id))})},G=()=>{const{id:l}=k(),[t,m]=p.useState(null),[s,g]=p.useState([]),[N,j]=p.useState(!0),[h,o]=p.useState(null),[f,u]=p.useState("disconnected"),v=async()=>{if(l)try{j(!0);const r=await w.get(`/teachers/${l}`);if(!r.data){o("Teacher not found");return}const n=(await w.get(`/reviews/teacher/${l}`)).data.filter(x=>x.status==="approved"),a=S(n),i={...r.data,metrics:{overallGrade:a.overall,teachingQuality:a.teaching,attendanceSupport:a.approachability,professionalBehavior:a.responsiveness}},R=n.map(x=>({...x,metrics:{overallGrade:x.rating,teachingQuality:x.metrics.teaching,attendanceSupport:x.metrics.approachability,professionalBehavior:x.metrics.responsiveness}}));m(i),g(R),o(null),u("connected")}catch(r){console.error("Error fetching data:",r),o("Failed to load teacher data"),u("disconnected");const c=localStorage.getItem("teacherReviewApp_teachers");if(c)try{const a=JSON.parse(c).find(i=>i.id===l);if(a){const i={...a,metrics:{overallGrade:a.rating||0,teachingQuality:a.rating||0,attendanceSupport:a.rating||0,professionalBehavior:a.rating||0}};m(i),g([]),o(null)}}catch(n){console.error("Error parsing cached teachers:",n)}}finally{j(!1)}},S=r=>{if(!r||r.length===0)return{overall:0,teaching:0,knowledge:0,engagement:0,approachability:0,responsiveness:0};const c=r.reduce((a,i)=>({overall:a.overall+i.rating,teaching:a.teaching+i.metrics.teaching,knowledge:a.knowledge+i.metrics.knowledge,engagement:a.engagement+i.metrics.engagement,approachability:a.approachability+i.metrics.approachability,responsiveness:a.responsiveness+i.metrics.responsiveness}),{overall:0,teaching:0,knowledge:0,engagement:0,approachability:0,responsiveness:0}),n=r.length;return{overall:c.overall/n,teaching:c.teaching/n,knowledge:c.knowledge/n,engagement:c.engagement/n,approachability:c.approachability/n,responsiveness:c.responsiveness/n}};return p.useEffect(()=>{v();const r=B(()=>v(),()=>v()),c=()=>u("connected"),n=()=>u("disconnected");return y.on("connect",c),y.on("disconnect",n),()=>{r(),y.off("connect",c),y.off("disconnect",n)}},[l]),N?e.jsx("div",{className:"flex h-screen w-full items-center justify-center",children:e.jsx("div",{className:"animate-pulse text-xl",children:"Loading teacher profile..."})}):!t||h?e.jsx("div",{className:"flex h-screen w-full items-center justify-center",children:e.jsx("div",{className:"text-xl text-red-600",children:h||"Teacher not found"})}):e.jsxs("div",{className:"min-h-screen bg-gray-50",children:[e.jsx("header",{className:"bg-primary-600 text-white py-6",children:e.jsxs("div",{className:"container mx-auto px-4",children:[e.jsx(b,{to:"/",className:"text-white hover:text-white/80 transition-colors font-medium",children:"← Back to Teachers"}),e.jsx("h1",{className:"text-3xl font-bold mt-2",children:t.name}),e.jsx("p",{className:"mt-1",children:t.field})]})}),e.jsxs("main",{className:"container mx-auto px-4 py-8",children:[f==="disconnected"&&e.jsx("div",{className:"mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md",children:e.jsx("p",{className:"text-yellow-700",children:"Working in offline mode. Some features may be limited."})}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-8",children:[e.jsxs("div",{className:"lg:col-span-1",children:[e.jsxs("div",{className:"card mb-6",children:[e.jsx("div",{className:"relative h-64 overflow-hidden rounded-t-lg",children:e.jsx("img",{src:t.photo||"/assets/images/teacher-placeholder.jpg",alt:t.name,className:"w-full h-full object-cover",onError:r=>{r.target.src="/assets/images/teacher-placeholder.jpg"}})}),e.jsxs("div",{className:"p-6",children:[e.jsx("h2",{className:"text-xl font-semibold text-gray-800",children:t.name}),e.jsxs("p",{className:"text-gray-600 mb-4",children:[t.field," • ",t.experience," years experience"]}),e.jsx("p",{className:"text-gray-700",children:t.bio})]})]}),e.jsx("div",{className:"card",children:e.jsxs("div",{className:"p-6",children:[e.jsx("h3",{className:"text-lg font-semibold text-gray-800 mb-4",children:"Ratings"}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"flex justify-between items-center",children:[e.jsx("span",{className:"text-gray-700",children:"Overall Grade"}),e.jsxs("div",{className:"flex items-center",children:[e.jsx(d,{rating:t.metrics.overallGrade,maxRating:5,readOnly:!0}),e.jsx("span",{className:"ml-2 font-medium text-black",children:t.metrics.overallGrade.toFixed(1)})]})]}),e.jsxs("div",{className:"flex justify-between items-center",children:[e.jsx("span",{className:"text-gray-700",children:"Teaching Quality"}),e.jsxs("div",{className:"flex items-center",children:[e.jsx(d,{rating:t.metrics.teachingQuality,maxRating:5,readOnly:!0}),e.jsx("span",{className:"ml-2 font-medium text-black",children:t.metrics.teachingQuality.toFixed(1)})]})]}),e.jsxs("div",{className:"flex justify-between items-center",children:[e.jsx("span",{className:"text-gray-700",children:"Attendance & Support"}),e.jsxs("div",{className:"flex items-center",children:[e.jsx(d,{rating:t.metrics.attendanceSupport,maxRating:5,readOnly:!0}),e.jsx("span",{className:"ml-2 font-medium text-black",children:t.metrics.attendanceSupport.toFixed(1)})]})]}),e.jsxs("div",{className:"flex justify-between items-center",children:[e.jsx("span",{className:"text-gray-700",children:"Professional Behavior"}),e.jsxs("div",{className:"flex items-center",children:[e.jsx(d,{rating:t.metrics.professionalBehavior,maxRating:5,readOnly:!0}),e.jsx("span",{className:"ml-2 font-medium text-black",children:t.metrics.professionalBehavior.toFixed(1)})]})]})]})]})})]}),e.jsxs("div",{className:"lg:col-span-2",children:[e.jsxs("div",{className:"flex justify-between items-center mb-6",children:[e.jsx("h2",{className:"text-2xl font-bold text-gray-800",children:"Student Reviews"}),e.jsx(b,{to:`/review/${t.id}`,className:"btn-primary",children:"Write a Review"})]}),s.length===0?e.jsx("div",{className:"text-center py-10 bg-white rounded-lg shadow-sm",children:e.jsx("p",{className:"text-gray-600",children:"No reviews yet. Be the first to review this teacher!"})}):e.jsx(T,{reviews:s})]})]})]}),e.jsx("footer",{className:"bg-gray-800 text-white py-8 mt-auto",children:e.jsx("div",{className:"container mx-auto px-4",children:e.jsxs("p",{className:"text-center",children:["© ",new Date().getFullYear()," Teacher Review Platform || developed by A.A.Ahmad"]})})})]})};export{G as default};
