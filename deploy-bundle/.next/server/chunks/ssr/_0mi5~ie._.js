module.exports=[346058,(a,b,c)=>{"use strict";function d(a){if("function"!=typeof WeakMap)return null;var b=new WeakMap,c=new WeakMap;return(d=function(a){return a?c:b})(a)}c._=function(a,b){if(!b&&a&&a.__esModule)return a;if(null===a||"object"!=typeof a&&"function"!=typeof a)return{default:a};var c=d(b);if(c&&c.has(a))return c.get(a);var e={__proto__:null},f=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var g in a)if("default"!==g&&Object.prototype.hasOwnProperty.call(a,g)){var h=f?Object.getOwnPropertyDescriptor(a,g):null;h&&(h.get||h.set)?Object.defineProperty(e,g,h):e[g]=a[g]}return e.default=a,c&&c.set(a,e),e}},739118,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0});var d={DEFAULT_SEGMENT_KEY:function(){return l},NOT_FOUND_SEGMENT_KEY:function(){return m},PAGE_SEGMENT_KEY:function(){return k},addSearchParamsIfPageSegment:function(){return i},computeSelectedLayoutSegment:function(){return j},getSegmentValue:function(){return f},getSelectedLayoutSegmentPath:function(){return function a(b,c,d=!0,e=[]){let g;if(d)g=b[1][c];else{let a=b[1];g=a.children??Object.values(a)[0]}if(!g)return e;let h=f(g[0]);return!h||h.startsWith(k)?e:(e.push(h),a(g,c,!1,e))}},isGroupSegment:function(){return g},isParallelRouteSegment:function(){return h}};for(var e in d)Object.defineProperty(c,e,{enumerable:!0,get:d[e]});function f(a){return Array.isArray(a)?a[1]:a}function g(a){return"("===a[0]&&a.endsWith(")")}function h(a){return a.startsWith("@")&&"@children"!==a}function i(a,b){if(a.includes(k)){let a=JSON.stringify(b);return"{}"!==a?k+"?"+a:k}return a}function j(a,b){if(!a||0===a.length)return null;let c="children"===b?a[0]:a[a.length-1];return c===l?null:c}let k="__PAGE__",l="__DEFAULT__",m="/_not-found"},588644,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"InvariantError",{enumerable:!0,get:function(){return d}});class d extends Error{constructor(a,b){super(`Invariant: ${a.endsWith(".")?a:a+"."} This is a bug in Next.js.`,b),this.name="InvariantError"}}},554427,(a,b,c)=>{"use strict";function d(){let a,b,c=new Promise((c,d)=>{a=c,b=d});return{resolve:a,reject:b,promise:c}}Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"createPromiseWithResolvers",{enumerable:!0,get:function(){return d}})},808591,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"useMergedRef",{enumerable:!0,get:function(){return e}});let d=a.r(572131);function e(a,b){let c=(0,d.useRef)(null),e=(0,d.useRef)(null);return(0,d.useCallback)(d=>{if(null===d){let a=c.current;a&&(c.current=null,a());let b=e.current;b&&(e.current=null,b())}else a&&(c.current=f(a,d)),b&&(e.current=f(b,d))},[a,b])}function f(a,b){if("function"!=typeof a)return a.current=b,()=>{a.current=null};{let c=a(b);return"function"==typeof c?c:()=>a(null)}}("function"==typeof c.default||"object"==typeof c.default&&null!==c.default)&&void 0===c.default.__esModule&&(Object.defineProperty(c.default,"__esModule",{value:!0}),Object.assign(c.default,c),b.exports=c.default)},192434,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"warnOnce",{enumerable:!0,get:function(){return d}});let d=a=>{}},68063,(a,b,c)=>{"use strict";let d;Object.defineProperty(c,"__esModule",{value:!0});var e={getAssetToken:function(){return i},getAssetTokenQuery:function(){return j},getDeploymentId:function(){return g},getDeploymentIdQuery:function(){return h}};for(var f in e)Object.defineProperty(c,f,{enumerable:!0,get:e[f]});function g(){return d}function h(a=!1){return d?`${a?"&":"?"}dpl=${d}`:""}function i(){return!1}function j(a=!1){return""}d=void 0},718402,a=>{"use strict";var b=a.i(187924),c=a.i(572131);class d extends Error{constructor(a,b){a instanceof Error?super(void 0,{cause:{err:a,...a.cause,...b}}):"string"==typeof a?(b instanceof Error&&(b={err:b,...b.cause}),super(a,b)):super(void 0,a),this.name=this.constructor.name,this.type=this.constructor.type??"AuthError",this.kind=this.constructor.kind??"error",Error.captureStackTrace?.(this,this.constructor);const c=`https://errors.authjs.dev#${this.type.toLowerCase()}`;this.message+=`${this.message?". ":""}Read more at ${c}`}}class e extends d{}class f extends d{}async function g(a,b,c,d={}){let f=`${h(b)}/${a}`;try{let a={headers:{"Content-Type":"application/json",...d?.headers?.cookie?{cookie:d.headers.cookie}:{}}};d?.body&&(a.body=JSON.stringify(d.body),a.method="POST");let b=await fetch(f,a),c=await b.json();if(!b.ok)throw c;return c}catch(a){return c.error(new e(a.message,a)),null}}function h(a){return`${a.baseUrlServer}${a.basePathServer}`}function i(){return Math.floor(Date.now()/1e3)}function j(a){let b=new URL("http://localhost:3000/api/auth");a&&!a.startsWith("http")&&(a=`https://${a}`);let c=new URL(a||b),d=("/"===c.pathname?b.pathname:c.pathname).replace(/\/$/,""),e=`${c.origin}${d}`;return{origin:c.origin,host:c.host,path:d,base:e,toString:()=>e}}let k={baseUrl:j(process.env.NEXTAUTH_URL??process.env.VERCEL_URL).origin,basePath:j(process.env.NEXTAUTH_URL).path,baseUrlServer:j(process.env.NEXTAUTH_URL_INTERNAL??process.env.NEXTAUTH_URL??process.env.VERCEL_URL).origin,basePathServer:j(process.env.NEXTAUTH_URL_INTERNAL??process.env.NEXTAUTH_URL).path,_lastSync:0,_session:void 0,_getSession:()=>{}},l=null;function m(){return"u"<typeof BroadcastChannel?{postMessage:()=>{},addEventListener:()=>{},removeEventListener:()=>{},name:"next-auth",onmessage:null,onmessageerror:null,close:()=>{},dispatchEvent:()=>!1}:new BroadcastChannel("next-auth")}function n(){return null===l&&(l=m()),l}let o={debug:console.debug,error:console.error,warn:console.warn},p=c.createContext?.(void 0);async function q(a){let b=await g("session",k,o,a);return(a?.broadcast??!0)&&m().postMessage({event:"session",data:{trigger:"getSession"}}),b}async function r(){let a=await g("csrf",k,o);return a?.csrfToken??""}async function s(){return g("providers",k,o)}async function t(a,b,c){let{callbackUrl:d,...e}=b??{},{redirect:f=!0,redirectTo:g=d??window.location.href,...i}=e,j=h(k),l=await s();if(!l){let a=`${j}/error`;window.location.href=a;return}if(!a||!l[a]){let a=`${j}/signin?${new URLSearchParams({callbackUrl:g})}`;window.location.href=a;return}let m=l[a].type;if("webauthn"===m)throw TypeError(`Provider id "${a}" refers to a WebAuthn provider.
Please use \`import { signIn } from "next-auth/webauthn"\` instead.`);let n=`${j}/${"credentials"===m?"callback":"signin"}/${a}`,o=await r(),p=await fetch(`${n}?${new URLSearchParams(c)}`,{method:"post",headers:{"Content-Type":"application/x-www-form-urlencoded","X-Auth-Return-Redirect":"1"},body:new URLSearchParams({...i,csrfToken:o,callbackUrl:g})}),q=await p.json();if(f){let a=q.url??g;window.location.href=a,a.includes("#")&&window.location.reload();return}let t=new URL(q.url).searchParams.get("error")??void 0,u=new URL(q.url).searchParams.get("code")??void 0;return p.ok&&await k._getSession({event:"storage"}),{error:t,code:u,status:p.status,ok:p.ok,url:t?null:q.url}}async function u(a){let{redirect:b=!0,redirectTo:c=a?.callbackUrl??window.location.href}=a??{},d=h(k),e=await r(),f=await fetch(`${d}/signout`,{method:"post",headers:{"Content-Type":"application/x-www-form-urlencoded","X-Auth-Return-Redirect":"1"},body:new URLSearchParams({csrfToken:e,callbackUrl:c})}),g=await f.json();if(n().postMessage({event:"session",data:{trigger:"signout"}}),b){let a=g.url??c;window.location.href=a,a.includes("#")&&window.location.reload();return}return await k._getSession({event:"storage"}),g}a.s(["SessionContext",0,p,"SessionProvider",0,function(a){if(!p)throw Error("React Context is unavailable in Server Components");let{children:d,basePath:e,refetchInterval:h,refetchWhenOffline:j}=a;e&&(k.basePath=e);let l=void 0!==a.session;k._lastSync=l?i():0;let[m,s]=c.useState(()=>(l&&(k._session=a.session),a.session)),[t,u]=c.useState(!l);c.useEffect(()=>(k._getSession=async({event:a}={})=>{try{let b="storage"===a;if(b||void 0===k._session){k._lastSync=i(),k._session=await q({broadcast:!b}),s(k._session);return}if(!a||null===k._session||i()<k._lastSync)return;k._lastSync=i(),k._session=await q(),s(k._session)}catch(a){o.error(new f(a.message,a))}finally{u(!1)}},k._getSession(),()=>{k._lastSync=0,k._session=void 0,k._getSession=()=>{}}),[]),c.useEffect(()=>{let a=()=>k._getSession({event:"storage"});return n().addEventListener("message",a),()=>n().removeEventListener("message",a)},[]),c.useEffect(()=>{let{refetchOnWindowFocus:b=!0}=a,c=()=>{b&&"visible"===document.visibilityState&&k._getSession({event:"visibilitychange"})};return document.addEventListener("visibilitychange",c,!1),()=>document.removeEventListener("visibilitychange",c,!1)},[a.refetchOnWindowFocus]);let v=function(){let[a,b]=c.useState("u">typeof navigator&&navigator.onLine),d=()=>b(!0),e=()=>b(!1);return c.useEffect(()=>(window.addEventListener("online",d),window.addEventListener("offline",e),()=>{window.removeEventListener("online",d),window.removeEventListener("offline",e)}),[]),a}(),w=!1!==j||v;c.useEffect(()=>{if(h&&w){let a=setInterval(()=>{k._session&&k._getSession({event:"poll"})},1e3*h);return()=>clearInterval(a)}},[h,w]);let x=c.useMemo(()=>({data:m,status:t?"loading":m?"authenticated":"unauthenticated",async update(a){if(t)return;u(!0);let b=await g("session",k,o,void 0===a?void 0:{body:{csrfToken:await r(),data:a}});return u(!1),b&&(s(b),n().postMessage({event:"session",data:{trigger:"getSession"}})),b}}),[m,t]);return(0,b.jsx)(p.Provider,{value:x,children:d})},"__NEXTAUTH",0,k,"getCsrfToken",0,r,"getProviders",0,s,"getSession",0,q,"signIn",0,t,"signOut",0,u,"useSession",0,function(a){if(!p)throw Error("React Context is unavailable in Server Components");let b=c.useContext(p),{required:d,onUnauthenticated:e}=a??{},f=d&&"unauthenticated"===b.status;return(c.useEffect(()=>{if(f){let a=`${k.basePath}/signin?${new URLSearchParams({error:"SessionRequired",callbackUrl:window.location.href})}`;e?e():window.location.href=a}},[f,e]),f)?{data:b.data,update:b.update,status:"loading"}:b}],718402)},188143,a=>{"use strict";var b=a.i(187924),c=a.i(665759),d=a.i(572131),e=a.i(718402),f=a.i(50944),g=a.i(238246);a.s(["default",0,function(){let{t:a}=(0,c.useT)(),[h,i]=(0,d.useState)(""),[j,k]=(0,d.useState)(""),[l,m]=(0,d.useState)(""),[n,o]=(0,d.useState)(!1),p=(0,f.useRouter)(),q=async b=>{b.preventDefault(),m(""),o(!0);let c=await (0,e.signIn)("credentials",{username:h,password:j,redirect:!1});c?.error?(m(a("auth.login.invalid")),o(!1)):(p.push("/"),p.refresh())};return(0,b.jsxs)("div",{className:"auth-bg min-h-screen flex items-center justify-center p-4",children:[(0,b.jsxs)("div",{className:"auth-card w-full max-w-sm",children:[(0,b.jsxs)("div",{className:"text-center mb-8",children:[(0,b.jsx)("div",{className:"logo-badge mx-auto mb-5",children:(0,b.jsx)("img",{src:"/logo.jpg",alt:a("auth.login.title"),className:"w-full h-full object-cover"})}),(0,b.jsx)("h1",{className:"text-2xl font-bold text-white tracking-wide",children:a("landing.brand")}),(0,b.jsx)("p",{className:"text-sm mt-1",style:{color:"oklch(0.75 0.08 130)"},children:a("auth.login.tagline")})]}),(0,b.jsxs)("form",{onSubmit:q,className:"space-y-4",children:[(0,b.jsxs)("div",{className:"space-y-1.5",children:[(0,b.jsx)("label",{className:"auth-label",htmlFor:"username",children:a("auth.login.username")}),(0,b.jsx)("input",{id:"username",className:"auth-input",value:h,onChange:a=>i(a.target.value),placeholder:a("auth.login.usernamePlaceholder"),required:!0,dir:"ltr"})]}),(0,b.jsxs)("div",{className:"space-y-1.5",children:[(0,b.jsx)("label",{className:"auth-label",htmlFor:"password",children:a("auth.login.password")}),(0,b.jsx)("input",{id:"password",type:"password",className:"auth-input",value:j,onChange:a=>k(a.target.value),placeholder:"••••••••",required:!0,dir:"ltr"})]}),l&&(0,b.jsx)("p",{className:"text-xs text-center py-2 px-3 rounded-lg bg-red-500/15 text-red-300",children:l}),(0,b.jsx)("button",{type:"submit",className:"auth-btn",disabled:n,children:n?(0,b.jsxs)("span",{className:"flex items-center justify-center gap-2",children:[(0,b.jsx)("span",{className:"inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"}),a("auth.login.signingIn")]}):a("auth.login.submit")})]}),(0,b.jsxs)("p",{className:"text-center text-sm mt-6",style:{color:"oklch(0.65 0.04 140)"},children:[a("auth.login.newHere")," ",(0,b.jsx)(g.default,{href:"/signup",className:"font-semibold transition-colors hover:opacity-80",style:{color:"oklch(0.82 0.16 82)"},children:a("auth.signup.title")})]})]}),(0,b.jsx)("style",{children:`
        .auth-bg {
          background-image:
            linear-gradient(oklch(0.18 0.08 155 / 0.88), oklch(0.18 0.08 155 / 0.92)),
            url('/cover.png');
          background-size: cover;
          background-position: center;
        }
        .auth-card {
          background: oklch(0.27 0.09 155 / 0.7);
          border: 1px solid oklch(0.40 0.08 155);
          border-radius: 1.25rem;
          padding: 2.5rem 2rem;
          backdrop-filter: blur(12px);
          box-shadow: 0 25px 60px oklch(0.10 0.05 155 / 0.5), 0 0 0 1px oklch(0.50 0.08 155 / 0.15);
        }
        .logo-badge {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid white;
          box-shadow: 0 0 0 3px oklch(0.80 0.16 82 / 0.4), 0 8px 24px oklch(0.10 0.05 155 / 0.5);
        }
        .auth-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: oklch(0.80 0.06 140);
          margin-bottom: 0.375rem;
        }
        .auth-input {
          width: 100%;
          background: oklch(0.20 0.07 155 / 0.6);
          border: 1px solid oklch(0.38 0.07 155);
          border-radius: 0.625rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.9375rem;
          color: white;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          text-align: right;
        }
        .auth-input::placeholder {
          color: oklch(0.50 0.04 155);
        }
        .auth-input:focus {
          border-color: oklch(0.55 0.12 155);
          box-shadow: 0 0 0 3px oklch(0.55 0.12 155 / 0.2);
        }
        .auth-btn {
          width: 100%;
          background: linear-gradient(135deg, oklch(0.42 0.14 155), oklch(0.35 0.12 155));
          border: 1px solid oklch(0.50 0.12 155);
          border-radius: 0.625rem;
          padding: 0.75rem 1rem;
          font-size: 0.9375rem;
          font-weight: 600;
          color: white;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
          margin-top: 0.25rem;
        }
        .auth-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, oklch(0.46 0.14 155), oklch(0.39 0.12 155));
          box-shadow: 0 4px 16px oklch(0.25 0.10 155 / 0.5);
        }
        .auth-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `})]})}])}];

//# sourceMappingURL=_0mi5~ie._.js.map