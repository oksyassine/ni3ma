module.exports=[346058,(a,b,c)=>{"use strict";function d(a){if("function"!=typeof WeakMap)return null;var b=new WeakMap,c=new WeakMap;return(d=function(a){return a?c:b})(a)}c._=function(a,b){if(!b&&a&&a.__esModule)return a;if(null===a||"object"!=typeof a&&"function"!=typeof a)return{default:a};var c=d(b);if(c&&c.has(a))return c.get(a);var e={__proto__:null},f=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var g in a)if("default"!==g&&Object.prototype.hasOwnProperty.call(a,g)){var h=f?Object.getOwnPropertyDescriptor(a,g):null;h&&(h.get||h.set)?Object.defineProperty(e,g,h):e[g]=a[g]}return e.default=a,c&&c.set(a,e),e}},739118,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0});var d={DEFAULT_SEGMENT_KEY:function(){return l},NOT_FOUND_SEGMENT_KEY:function(){return m},PAGE_SEGMENT_KEY:function(){return k},addSearchParamsIfPageSegment:function(){return i},computeSelectedLayoutSegment:function(){return j},getSegmentValue:function(){return f},getSelectedLayoutSegmentPath:function(){return function a(b,c,d=!0,e=[]){let g;if(d)g=b[1][c];else{let a=b[1];g=a.children??Object.values(a)[0]}if(!g)return e;let h=f(g[0]);return!h||h.startsWith(k)?e:(e.push(h),a(g,c,!1,e))}},isGroupSegment:function(){return g},isParallelRouteSegment:function(){return h}};for(var e in d)Object.defineProperty(c,e,{enumerable:!0,get:d[e]});function f(a){return Array.isArray(a)?a[1]:a}function g(a){return"("===a[0]&&a.endsWith(")")}function h(a){return a.startsWith("@")&&"@children"!==a}function i(a,b){if(a.includes(k)){let a=JSON.stringify(b);return"{}"!==a?k+"?"+a:k}return a}function j(a,b){if(!a||0===a.length)return null;let c="children"===b?a[0]:a[a.length-1];return c===l?null:c}let k="__PAGE__",l="__DEFAULT__",m="/_not-found"},588644,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"InvariantError",{enumerable:!0,get:function(){return d}});class d extends Error{constructor(a,b){super(`Invariant: ${a.endsWith(".")?a:a+"."} This is a bug in Next.js.`,b),this.name="InvariantError"}}},554427,(a,b,c)=>{"use strict";function d(){let a,b,c=new Promise((c,d)=>{a=c,b=d});return{resolve:a,reject:b,promise:c}}Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"createPromiseWithResolvers",{enumerable:!0,get:function(){return d}})},808591,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"useMergedRef",{enumerable:!0,get:function(){return e}});let d=a.r(572131);function e(a,b){let c=(0,d.useRef)(null),e=(0,d.useRef)(null);return(0,d.useCallback)(d=>{if(null===d){let a=c.current;a&&(c.current=null,a());let b=e.current;b&&(e.current=null,b())}else a&&(c.current=f(a,d)),b&&(e.current=f(b,d))},[a,b])}function f(a,b){if("function"!=typeof a)return a.current=b,()=>{a.current=null};{let c=a(b);return"function"==typeof c?c:()=>a(null)}}("function"==typeof c.default||"object"==typeof c.default&&null!==c.default)&&void 0===c.default.__esModule&&(Object.defineProperty(c.default,"__esModule",{value:!0}),Object.assign(c.default,c),b.exports=c.default)},192434,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"warnOnce",{enumerable:!0,get:function(){return d}});let d=a=>{}},68063,(a,b,c)=>{"use strict";let d;Object.defineProperty(c,"__esModule",{value:!0});var e={getAssetToken:function(){return i},getAssetTokenQuery:function(){return j},getDeploymentId:function(){return g},getDeploymentIdQuery:function(){return h}};for(var f in e)Object.defineProperty(c,f,{enumerable:!0,get:e[f]});function g(){return d}function h(a=!1){return d?`${a?"&":"?"}dpl=${d}`:""}function i(){return!1}function j(a=!1){return""}d=void 0},901135,a=>{"use strict";let b=/^[a-z][a-z0-9._-]*[a-z0-9]$/,c={ا:"a",أ:"a",إ:"i",آ:"a",ب:"b",ت:"t",ث:"th",ج:"j",ح:"h",خ:"kh",د:"d",ذ:"dh",ر:"r",ز:"z",س:"s",ش:"ch",ص:"s",ض:"d",ط:"t",ظ:"z",ع:"a",غ:"gh",ف:"f",ق:"q",ك:"k",ل:"l",م:"m",ن:"n",ه:"h",و:"w",ي:"y",ى:"a",ة:"a",ء:"",ؤ:"w",ئ:"y"},d=/[ً-ْٰـ‎‏]/g;a.s(["suggestUsernameFromName",0,function(a){if(!a)return"";let b=a.normalize("NFC").replace(d,"").trim(),e=[];for(let a of b){if(" "===a||"	"===a){e.push(".");continue}let b=c[a];if(void 0!==b){e.push(b);continue}if(/[a-zA-Z0-9]/.test(a)){e.push(a.toLowerCase());continue}if(/[._-]/.test(a)){e.push(a);continue}}return e.join("").replace(/[._-]{2,}/g,".").replace(/^[._\d-]+/,"").replace(/[._-]+$/,"").slice(0,30)},"validateUsernameFormat",0,function(a){let c=(a??"").trim();return c?c.length<3?"اسم المستخدم قصير جدا (الحد الأدنى 3 أحرف)":c.length>30?"اسم المستخدم طويل جدا (الحد الأقصى 30 حرفا)":b.test(c)?/[._-]{2,}/.test(c)?"لا يُسمح بتكرار الرموز (.. مثلا)":null:"اسم المستخدم يجب أن يبدأ بحرف لاتيني صغير (a-z) ويحتوي فقط على a-z و 0-9 والرموز . _ -":"اسم المستخدم مطلوب"}])},440461,a=>{"use strict";var b=a.i(187924),c=a.i(572131),d=a.i(50944),e=a.i(238246),f=a.i(901135),g=a.i(665759);a.s(["default",0,function({params:a}){let{token:h}=(0,c.use)(a),i=(0,d.useRouter)(),{t:j}=(0,g.useT)(),[k,l]=(0,c.useState)("loading"),[m,n]=(0,c.useState)(""),[o,p]=(0,c.useState)(""),[q,r]=(0,c.useState)(""),[s,t]=(0,c.useState)(""),[u,v]=(0,c.useState)(""),[w,x]=(0,c.useState)(!1),[y,z]=(0,c.useState)("");(0,c.useEffect)(()=>{fetch(`/api/invite/${h}`).then(async a=>{let b=await a.json();a.ok?(p(b.fullName),l("ready")):(n(b.error??j("auth.invite.invalidLink")),l("error"))}).catch(()=>{n(j("auth.invite.connectionError")),l("error")})},[h]);let A=async a=>{a.preventDefault(),z("");let b=(0,f.validateUsernameFormat)(q);if(b)return void z(b);if(s.length<6)return void z(j("auth.invite.error.passwordTooShort"));if(s!==u)return void z(j("auth.invite.error.passwordMismatch"));x(!0);let c=await fetch(`/api/invite/${h}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:q.trim().toLowerCase(),password:s})});c.ok?l("success"):(z((await c.json()).error??j("auth.invite.genericError")),x(!1))};return(0,b.jsxs)("div",{className:"auth-bg min-h-screen flex items-center justify-center p-4",children:[(0,b.jsxs)("div",{className:"auth-card w-full max-w-sm",children:[(0,b.jsxs)("div",{className:"text-center mb-7",children:[(0,b.jsx)("div",{className:"logo-badge mx-auto mb-4",children:(0,b.jsx)("img",{src:"/logo.jpg",alt:j("auth.org.name"),className:"w-full h-full object-cover"})}),(0,b.jsx)("h1",{className:"text-xl font-bold text-white",children:j("auth.org.name")})]}),"loading"===k&&(0,b.jsxs)("div",{className:"text-center py-6",style:{color:"oklch(0.70 0.07 140)"},children:[(0,b.jsx)("span",{className:"inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mb-3"}),(0,b.jsx)("p",{className:"text-sm",children:j("auth.invite.verifying")})]}),"error"===k&&(0,b.jsxs)("div",{className:"text-center py-4",children:[(0,b.jsx)("div",{className:"error-icon mx-auto mb-4",children:"✕"}),(0,b.jsx)("p",{className:"text-white font-semibold mb-2",children:j("auth.invite.invalidLink")}),(0,b.jsx)("p",{className:"text-sm mb-5",style:{color:"oklch(0.70 0.07 140)"},children:m}),(0,b.jsx)(e.default,{href:"/login",className:"auth-btn block text-center",style:{textDecoration:"none"},children:j("auth.login.title")})]}),"ready"===k&&(0,b.jsxs)(b.Fragment,{children:[(0,b.jsxs)("p",{className:"text-center text-sm mb-5",style:{color:"oklch(0.78 0.10 130)"},children:[j("auth.invite.welcome")," ",(0,b.jsx)("span",{className:"text-white font-semibold",children:o}),(0,b.jsx)("br",{}),j("auth.invite.setUsernameHint")]}),(0,b.jsxs)("form",{onSubmit:A,className:"space-y-4",children:[(0,b.jsxs)("div",{className:"space-y-1",children:[(0,b.jsx)("label",{className:"auth-label",children:j("auth.login.username")}),(0,b.jsxs)("div",{className:"flex gap-2",children:[(0,b.jsx)("input",{className:"auth-input flex-1 min-w-0",value:q,onChange:a=>r(a.target.value.toLowerCase()),placeholder:j("auth.invite.username.placeholder"),dir:"ltr",required:!0}),o&&(0,b.jsxs)("button",{type:"button",onClick:()=>r((0,f.suggestUsernameFromName)(o)),className:"text-xs px-2 py-1.5 rounded-md whitespace-nowrap shrink-0",style:{background:"oklch(0.42 0.14 155)",color:"white"},children:["✨ ",j("auth.invite.suggest")]})]}),(0,b.jsx)("p",{className:"text-[11px]",style:{color:"oklch(0.55 0.06 140)"},children:j("auth.invite.usernameRules")})]}),(0,b.jsxs)("div",{className:"space-y-1",children:[(0,b.jsx)("label",{className:"auth-label",children:j("auth.login.password")}),(0,b.jsx)("input",{type:"password",className:"auth-input",value:s,onChange:a=>t(a.target.value),placeholder:j("auth.invite.password.placeholder"),dir:"ltr",required:!0})]}),(0,b.jsxs)("div",{className:"space-y-1",children:[(0,b.jsx)("label",{className:"auth-label",children:j("auth.invite.confirmPassword")}),(0,b.jsx)("input",{type:"password",className:"auth-input",value:u,onChange:a=>v(a.target.value),placeholder:"••••••••",dir:"ltr",required:!0})]}),y&&(0,b.jsx)("p",{className:"text-xs py-2 px-3 rounded-lg bg-red-500/15 text-red-300 text-center",children:y}),(0,b.jsx)("button",{type:"submit",className:"auth-btn",disabled:w,children:w?(0,b.jsxs)("span",{className:"flex items-center justify-center gap-2",children:[(0,b.jsx)("span",{className:"inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"}),j("auth.invite.saving")]}):j("auth.invite.activateAccount")})]})]}),"success"===k&&(0,b.jsxs)("div",{className:"text-center py-2",children:[(0,b.jsx)("div",{className:"success-check mx-auto mb-4",children:"✓"}),(0,b.jsx)("p",{className:"text-white font-semibold mb-2",children:j("auth.invite.success.title")}),(0,b.jsx)("p",{className:"text-sm mb-5",style:{color:"oklch(0.72 0.07 130)"},children:j("auth.invite.success.canLogin")}),(0,b.jsx)("button",{className:"auth-btn",onClick:()=>i.push("/login"),children:j("auth.login.title")})]})]}),(0,b.jsx)("style",{children:`
        .auth-bg {
          background-image:
            linear-gradient(oklch(0.18 0.08 155 / 0.88), oklch(0.18 0.08 155 / 0.92)),
            url('/cover.png');
          background-size: cover;
          background-position: center;
        }
        .auth-card {
          background: oklch(0.27 0.09 155 / 0.75);
          border: 1px solid oklch(0.40 0.08 155);
          border-radius: 1.25rem;
          padding: 2.25rem 2rem;
          backdrop-filter: blur(12px);
          box-shadow: 0 25px 60px oklch(0.10 0.05 155 / 0.5);
        }
        .logo-badge {
          width: 68px; height: 68px;
          border-radius: 50%; overflow: hidden;
          border: 3px solid white;
          box-shadow: 0 0 0 3px oklch(0.80 0.16 82 / 0.4), 0 8px 24px oklch(0.10 0.05 155 / 0.5);
        }
        .auth-label { display: block; font-size: 0.8rem; font-weight: 600; color: oklch(0.78 0.06 140); }
        .auth-input {
          width: 100%;
          background: oklch(0.20 0.07 155 / 0.6);
          border: 1px solid oklch(0.38 0.07 155);
          border-radius: 0.5rem;
          padding: 0.5625rem 0.75rem;
          font-size: 0.9rem; color: white; font-family: inherit;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          text-align: right;
        }
        .auth-input::placeholder { color: oklch(0.48 0.04 155); }
        .auth-input:focus { border-color: oklch(0.55 0.12 155); box-shadow: 0 0 0 3px oklch(0.55 0.12 155 / 0.2); }
        .auth-btn {
          width: 100%;
          background: linear-gradient(135deg, oklch(0.42 0.14 155), oklch(0.35 0.12 155));
          border: 1px solid oklch(0.50 0.12 155);
          border-radius: 0.625rem;
          padding: 0.75rem 1rem;
          font-size: 0.9375rem; font-weight: 600;
          color: white; font-family: inherit;
          cursor: pointer; transition: all 0.15s; display: block;
        }
        .auth-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, oklch(0.46 0.14 155), oklch(0.39 0.12 155));
        }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .success-check {
          width: 56px; height: 56px;
          background: oklch(0.42 0.16 155);
          border: 2px solid oklch(0.60 0.16 155);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.375rem; color: white;
        }
        .error-icon {
          width: 56px; height: 56px;
          background: oklch(0.45 0.18 27 / 0.3);
          border: 2px solid oklch(0.60 0.20 27);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.375rem; color: oklch(0.75 0.20 27);
        }
      `})]})}])}];

//# sourceMappingURL=_12gi~9-._.js.map