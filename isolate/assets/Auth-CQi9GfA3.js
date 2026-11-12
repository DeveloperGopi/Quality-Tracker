import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { c as cn, u as useAuth, a as useConvex, b as useNavigate, d as useSearchParams, C as CardTitle, e as CardDescription, f as CardContent, g as CardFooter, B as Button, h as Card, i as CardHeader, j as api } from './index-CBV6wOh8.js';
import { I as Input } from './input-Cy2oZLur.js';
import { L as Label } from './label-BaPkqXdo.js';
import { r as reactExports, s as Mail, L as LoaderCircle, p as Lock, U as User } from './icons-BxQpodNr.js';
import { N as NqasLogo } from './NqasLogo-CIWlMexW.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';

var Bt=Object.defineProperty,At=Object.defineProperties;var kt=Object.getOwnPropertyDescriptors;var Y=Object.getOwnPropertySymbols;var gt=Object.prototype.hasOwnProperty,Et=Object.prototype.propertyIsEnumerable;var vt=(r,s,e)=>s in r?Bt(r,s,{enumerable:true,configurable:true,writable:true,value:e}):r[s]=e,St=(r,s)=>{for(var e in s||(s={}))gt.call(s,e)&&vt(r,e,s[e]);if(Y)for(var e of Y(s))Et.call(s,e)&&vt(r,e,s[e]);return r},bt=(r,s)=>At(r,kt(s));var Pt=(r,s)=>{var e={};for(var u in r)gt.call(r,u)&&s.indexOf(u)<0&&(e[u]=r[u]);if(r!=null&&Y)for(var u of Y(r))s.indexOf(u)<0&&Et.call(r,u)&&(e[u]=r[u]);return e};function ht(r){let s=setTimeout(r,0),e=setTimeout(r,10),u=setTimeout(r,50);return [s,e,u]}function _t(r){let s=reactExports.useRef();return reactExports.useEffect(()=>{s.current=r;}),s.current}var Ot=18,wt=40,Gt=`${wt}px`,xt=["[data-lastpass-icon-root]","com-1password-button","[data-dashlanecreated]",'[style$="2147483647 !important;"]'].join(",");function Tt({containerRef:r,inputRef:s,pushPasswordManagerStrategy:e,isFocused:u}){let[P,D]=reactExports.useState(false),[G,H]=reactExports.useState(false),[F,W]=reactExports.useState(false),Z=reactExports.useMemo(()=>e==="none"?false:(e==="increase-width"||e==="experimental-no-flickering")&&P&&G,[P,G,e]),T=reactExports.useCallback(()=>{let f=r.current,h=s.current;if(!f||!h||F||e==="none")return;let a=f,B=a.getBoundingClientRect().left+a.offsetWidth,A=a.getBoundingClientRect().top+a.offsetHeight/2,z=B-Ot,q=A;document.querySelectorAll(xt).length===0&&document.elementFromPoint(z,q)===f||(D(true),W(true));},[r,s,F,e]);return reactExports.useEffect(()=>{let f=r.current;if(!f||e==="none")return;function h(){let A=window.innerWidth-f.getBoundingClientRect().right;H(A>=wt);}h();let a=setInterval(h,1e3);return ()=>{clearInterval(a);}},[r,e]),reactExports.useEffect(()=>{let f=u||document.activeElement===s.current;if(e==="none"||!f)return;let h=setTimeout(T,0),a=setTimeout(T,2e3),B=setTimeout(T,5e3),A=setTimeout(()=>{W(true);},6e3);return ()=>{clearTimeout(h),clearTimeout(a),clearTimeout(B),clearTimeout(A);}},[s,u,e,T]),{hasPWMBadge:P,willPushPWMBadge:Z,PWM_BADGE_SPACE_WIDTH:Gt}}var jt=reactExports.createContext({}),Lt=reactExports.forwardRef((A,B)=>{var z=A,{value:r,onChange:s,maxLength:e,textAlign:u="left",pattern:P,placeholder:D,inputMode:G="numeric",onComplete:H,pushPasswordManagerStrategy:F="increase-width",pasteTransformer:W,containerClassName:Z,noScriptCSSFallback:T=Nt,render:f,children:h}=z,a=Pt(z,["value","onChange","maxLength","textAlign","pattern","placeholder","inputMode","onComplete","pushPasswordManagerStrategy","pasteTransformer","containerClassName","noScriptCSSFallback","render","children"]);var X,lt,ut,dt,ft;let[q,nt]=reactExports.useState(typeof a.defaultValue=="string"?a.defaultValue:""),i=r!=null?r:q,I=_t(i),x=reactExports.useCallback(t=>{s==null||s(t),nt(t);},[s]),m=reactExports.useMemo(()=>P?typeof P=="string"?new RegExp(P):P:null,[P]),l=reactExports.useRef(null),K=reactExports.useRef(null),J=reactExports.useRef({value:i,onChange:x,isIOS:typeof window!="undefined"&&((lt=(X=window==null?void 0:window.CSS)==null?void 0:X.supports)==null?void 0:lt.call(X,"-webkit-touch-callout","none"))}),V=reactExports.useRef({prev:[(ut=l.current)==null?void 0:ut.selectionStart,(dt=l.current)==null?void 0:dt.selectionEnd,(ft=l.current)==null?void 0:ft.selectionDirection]});reactExports.useImperativeHandle(B,()=>l.current,[]),reactExports.useEffect(()=>{let t=l.current,o=K.current;if(!t||!o)return;J.current.value!==t.value&&J.current.onChange(t.value),V.current.prev=[t.selectionStart,t.selectionEnd,t.selectionDirection];function d(){if(document.activeElement!==t){L(null),N(null);return}let c=t.selectionStart,b=t.selectionEnd,mt=t.selectionDirection,v=t.maxLength,C=t.value,_=V.current.prev,g=-1,E=-1,w;if(C.length!==0&&c!==null&&b!==null){let Dt=c===b,Ht=c===C.length&&C.length<v;if(Dt&&!Ht){let y=c;if(y===0)g=0,E=1,w="forward";else if(y===v)g=y-1,E=y,w="backward";else if(v>1&&C.length>1){let et=0;if(_[0]!==null&&_[1]!==null){w=y<_[1]?"backward":"forward";let Wt=_[0]===_[1]&&_[0]<v;w==="backward"&&!Wt&&(et=-1);}g=et+y,E=et+y+1;}}g!==-1&&E!==-1&&g!==E&&l.current.setSelectionRange(g,E,w);}let pt=g!==-1?g:c,Rt=E!==-1?E:b,yt=w!=null?w:mt;L(pt),N(Rt),V.current.prev=[pt,Rt,yt];}if(document.addEventListener("selectionchange",d,{capture:true}),d(),document.activeElement===t&&Q(true),!document.getElementById("input-otp-style")){let c=document.createElement("style");if(c.id="input-otp-style",document.head.appendChild(c),c.sheet){let b="background: transparent !important; color: transparent !important; border-color: transparent !important; opacity: 0 !important; box-shadow: none !important; -webkit-box-shadow: none !important; -webkit-text-fill-color: transparent !important;";$(c.sheet,"[data-input-otp]::selection { background: transparent !important; color: transparent !important; }"),$(c.sheet,`[data-input-otp]:autofill { ${b} }`),$(c.sheet,`[data-input-otp]:-webkit-autofill { ${b} }`),$(c.sheet,"@supports (-webkit-touch-callout: none) { [data-input-otp] { letter-spacing: -.6em !important; font-weight: 100 !important; font-stretch: ultra-condensed; font-optical-sizing: none !important; left: -1px !important; right: 1px !important; } }"),$(c.sheet,"[data-input-otp] + * { pointer-events: all !important; }");}}let R=()=>{o&&o.style.setProperty("--root-height",`${t.clientHeight}px`);};R();let p=new ResizeObserver(R);return p.observe(t),()=>{document.removeEventListener("selectionchange",d,{capture:true}),p.disconnect();}},[]);let[ot,rt]=reactExports.useState(false),[j,Q]=reactExports.useState(false),[M,L]=reactExports.useState(null),[k,N]=reactExports.useState(null);reactExports.useEffect(()=>{ht(()=>{var R,p,c,b;(R=l.current)==null||R.dispatchEvent(new Event("input"));let t=(p=l.current)==null?void 0:p.selectionStart,o=(c=l.current)==null?void 0:c.selectionEnd,d=(b=l.current)==null?void 0:b.selectionDirection;t!==null&&o!==null&&(L(t),N(o),V.current.prev=[t,o,d]);});},[i,j]),reactExports.useEffect(()=>{I!==void 0&&i!==I&&I.length<e&&i.length===e&&(H==null||H(i));},[e,H,I,i]);let O=Tt({containerRef:K,inputRef:l,pushPasswordManagerStrategy:F,isFocused:j}),st=reactExports.useCallback(t=>{let o=t.currentTarget.value.slice(0,e);if(o.length>0&&m&&!m.test(o)){t.preventDefault();return}typeof I=="string"&&o.length<I.length&&document.dispatchEvent(new Event("selectionchange")),x(o);},[e,x,I,m]),at=reactExports.useCallback(()=>{var t;if(l.current){let o=Math.min(l.current.value.length,e-1),d=l.current.value.length;(t=l.current)==null||t.setSelectionRange(o,d),L(o),N(d);}Q(true);},[e]),ct=reactExports.useCallback(t=>{var g,E;let o=l.current;if(!W&&(!J.current.isIOS||!t.clipboardData||!o))return;let d=t.clipboardData.getData("text/plain"),R=W?W(d):d;t.preventDefault();let p=(g=l.current)==null?void 0:g.selectionStart,c=(E=l.current)==null?void 0:E.selectionEnd,v=(p!==c?i.slice(0,p)+R+i.slice(c):i.slice(0,p)+R+i.slice(p)).slice(0,e);if(v.length>0&&m&&!m.test(v))return;o.value=v,x(v);let C=Math.min(v.length,e-1),_=v.length;o.setSelectionRange(C,_),L(C),N(_);},[e,x,m,i]),It=reactExports.useMemo(()=>({position:"relative",cursor:a.disabled?"default":"text",userSelect:"none",WebkitUserSelect:"none",pointerEvents:"none"}),[a.disabled]),it=reactExports.useMemo(()=>({position:"absolute",inset:0,width:O.willPushPWMBadge?`calc(100% + ${O.PWM_BADGE_SPACE_WIDTH})`:"100%",clipPath:O.willPushPWMBadge?`inset(0 ${O.PWM_BADGE_SPACE_WIDTH} 0 0)`:void 0,height:"100%",display:"flex",textAlign:u,opacity:"1",color:"transparent",pointerEvents:"all",background:"transparent",caretColor:"transparent",border:"0 solid transparent",outline:"0 solid transparent",boxShadow:"none",lineHeight:"1",letterSpacing:"-.5em",fontSize:"var(--root-height)",fontFamily:"monospace",fontVariantNumeric:"tabular-nums"}),[O.PWM_BADGE_SPACE_WIDTH,O.willPushPWMBadge,u]),Mt=reactExports.useMemo(()=>reactExports.createElement("input",bt(St({autoComplete:a.autoComplete||"one-time-code"},a),{"data-input-otp":true,"data-input-otp-placeholder-shown":i.length===0||void 0,"data-input-otp-mss":M,"data-input-otp-mse":k,inputMode:G,pattern:m==null?void 0:m.source,"aria-placeholder":D,style:it,maxLength:e,value:i,ref:l,onPaste:t=>{var o;ct(t),(o=a.onPaste)==null||o.call(a,t);},onChange:st,onMouseOver:t=>{var o;rt(true),(o=a.onMouseOver)==null||o.call(a,t);},onMouseLeave:t=>{var o;rt(false),(o=a.onMouseLeave)==null||o.call(a,t);},onFocus:t=>{var o;at(),(o=a.onFocus)==null||o.call(a,t);},onBlur:t=>{var o;Q(false),(o=a.onBlur)==null||o.call(a,t);}})),[st,at,ct,G,it,e,k,M,a,m==null?void 0:m.source,i]),tt=reactExports.useMemo(()=>({slots:Array.from({length:e}).map((t,o)=>{var c;let d=j&&M!==null&&k!==null&&(M===k&&o===M||o>=M&&o<k),R=i[o]!==void 0?i[o]:null,p=i[0]!==void 0?null:(c=D==null?void 0:D[o])!=null?c:null;return {char:R,placeholderChar:p,isActive:d,hasFakeCaret:d&&R===null}}),isFocused:j,isHovering:!a.disabled&&ot}),[j,ot,e,k,M,a.disabled,i]),Ct=reactExports.useMemo(()=>f?f(tt):reactExports.createElement(jt.Provider,{value:tt},h),[h,tt,f]);return reactExports.createElement(reactExports.Fragment,null,T!==null&&reactExports.createElement("noscript",null,reactExports.createElement("style",null,T)),reactExports.createElement("div",{ref:K,"data-input-otp-container":true,style:It,className:Z},Ct,reactExports.createElement("div",{style:{position:"absolute",inset:0,pointerEvents:"none"}},Mt)))});Lt.displayName="Input";function $(r,s){try{r.insertRule(s);}catch(e){console.error("input-otp could not insert CSS rule:",s);}}var Nt=`
[data-input-otp] {
  --nojs-bg: white !important;
  --nojs-fg: black !important;

  background-color: var(--nojs-bg) !important;
  color: var(--nojs-fg) !important;
  caret-color: var(--nojs-fg) !important;
  letter-spacing: .25em !important;
  text-align: center !important;
  border: 1px solid var(--nojs-fg) !important;
  border-radius: 4px !important;
  width: 100% !important;
}
@media (prefers-color-scheme: dark) {
  [data-input-otp] {
    --nojs-bg: black !important;
    --nojs-fg: white !important;
  }
}`;

function InputOTP({
  className,
  containerClassName,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Lt,
    {
      "data-slot": "input-otp",
      containerClassName: cn(
        "flex items-center gap-2 has-disabled:opacity-50",
        containerClassName
      ),
      className: cn("disabled:cursor-not-allowed", className),
      ...props
    }
  );
}
function InputOTPGroup({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-slot": "input-otp-group",
      className: cn("flex items-center", className),
      ...props
    }
  );
}
function InputOTPSlot({
  index,
  className,
  ...props
}) {
  const inputOTPContext = reactExports.useContext(jt);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-slot": "input-otp-slot",
      "data-active": isActive,
      className: cn(
        "data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive dark:bg-input/30 border-input relative flex h-9 w-9 items-center justify-center border-y border-r text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px]",
        className
      ),
      ...props,
      children: [
        char,
        hasFakeCaret && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-0 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-caret-blink bg-foreground h-4 w-px duration-1000" }) })
      ]
    }
  );
}

function resolveRedirectAfterAuth(returnTo, fallback = "/dashboard") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}
function AuthFrame({
  onLogoClick,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen flex flex-col", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full flex-col", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "min-w-[350px] border shadow-md", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "aria-label": "NQAS Tracker home",
        className: "mb-4 mt-4 cursor-pointer rounded-lg",
        onClick: onLogoClick,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(NqasLogo, { className: "size-16" })
      }
    ) }) }),
    children
  ] }) }) }) });
}
function friendlyAuthError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("InvalidAccountId") || msg.includes("NO_PASSWORD_ACCOUNT") || msg.includes("reading '_id'")) {
    return "No password account exists for this email yet. Use Register with the same email to set a password — accounts created before the password switch must register once (your role is restored automatically for designated admins).";
  }
  if (msg.includes("InvalidSecret")) return "Incorrect password. Try again or use Forgot password.";
  if (msg.includes("already exists")) {
    return "This email is already registered. Sign in instead, or use Forgot password if you don't remember your password.";
  }
  if (msg.includes("TooManyFailedAttempts")) {
    return "Too many failed attempts. Wait a moment and try again.";
  }
  return err instanceof Error ? err.message : "Authentication failed";
}
function Auth({ redirectAfterAuth } = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const convex = useConvex();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth
  );
  const [mode, setMode] = reactExports.useState("signIn");
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [resetEmail, setResetEmail] = reactExports.useState("");
  const [resetCode, setResetCode] = reactExports.useState("");
  reactExports.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const flow = mode === "signUp" ? "signUp" : "signIn";
    try {
      await signIn("password", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        ...mode === "signUp" ? { name: String(formData.get("name") ?? ""), flow } : { flow }
      });
      navigate(redirect);
    } catch (err) {
      setError(friendlyAuthError(err));
      setIsLoading(false);
    }
  };
  const handleResetRequest = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    try {
      const account = await convex.query(api.users.hasPasswordAccount, {
        email
      });
      if (account === null) {
        setError(
          "No account exists for this email. Use Register to create one."
        );
        setIsLoading(false);
        return;
      }
      if (!account.hasPassword) {
        setError(
          "This account has no password set (it was created under the earlier email-code sign-in). Use Register with the same email once to set a password — your role and data are kept."
        );
        setIsLoading(false);
        return;
      }
      await signIn("password", { email, flow: "reset" });
      setResetEmail(email);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("InvalidAccountId") || msg.includes("reading '_id'") ? "This account has no password set. Use Register with the same email once to set a password — your role and data are kept." : friendlyAuthError(err)
      );
    }
    setIsLoading(false);
  };
  const handleResetVerify = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      await signIn("password", {
        email: resetEmail,
        flow: "reset-verification",
        code: resetCode,
        newPassword: String(formData.get("newPassword") ?? "")
      });
      navigate(redirect);
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("InvalidSecret") ? "Invalid or expired code" : friendlyAuthError(err)
      );
      setResetCode("");
    }
    setIsLoading(false);
  };
  const backToSignIn = () => {
    setMode("signIn");
    setResetEmail("");
    setResetCode("");
    setError(null);
  };
  if (mode === "reset" && !resetEmail) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(AuthFrame, { onLogoClick: () => navigate("/"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xl text-center", children: "Reset password" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { className: "text-center mt-1", children: "We'll email you a 6-digit reset code" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleResetRequest, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-3 mt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                name: "email",
                placeholder: "abc@gmail.com",
                type: "email",
                className: "pl-9",
                disabled: isLoading,
                required: true
              }
            )
          ] }),
          error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-red-500", children: error })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardFooter, { className: "flex-col gap-2 pb-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "submit", className: "w-full", disabled: isLoading, children: [
            isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }),
            "Send reset code"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              variant: "ghost",
              className: "w-full",
              onClick: backToSignIn,
              children: "Back to sign in"
            }
          )
        ] })
      ] })
    ] });
  }
  if (mode === "reset" && resetEmail) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(AuthFrame, { onLogoClick: () => navigate("/"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xl text-center", children: "Reset password" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardDescription, { className: "text-center mt-1", children: [
        "Code sent to ",
        resetEmail
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleResetVerify, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-4 mt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            InputOTP,
            {
              value: resetCode,
              onChange: setResetCode,
              maxLength: 6,
              disabled: isLoading,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(InputOTPGroup, { children: Array.from({ length: 6 }).map((_, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(InputOTPSlot, { index: idx }, idx)) })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "newPassword", children: "New password" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  id: "newPassword",
                  name: "newPassword",
                  type: "password",
                  placeholder: "At least 8 characters",
                  className: "pl-9",
                  disabled: isLoading,
                  required: true,
                  minLength: 8
                }
              )
            ] })
          ] }),
          error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-red-500 text-center", children: error })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardFooter, { className: "flex-col gap-2 pb-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              type: "submit",
              className: "w-full",
              disabled: isLoading || resetCode.length !== 6,
              children: [
                isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }),
                "Set new password"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              variant: "ghost",
              className: "w-full",
              onClick: backToSignIn,
              children: "Back to sign in"
            }
          )
        ] })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AuthFrame, { onLogoClick: () => navigate("/"), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xl text-center", children: mode === "signIn" ? "Sign in" : "Register" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { className: "text-center mt-1", children: mode === "signIn" ? "Sign in with your email and password" : "Create an account — a State Admin must approve new registrations" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-3 mt-2", children: [
        mode === "signUp" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              name: "name",
              placeholder: "Full name",
              className: "pl-9",
              disabled: isLoading,
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              name: "email",
              placeholder: "abc@gmail.com",
              type: "email",
              className: "pl-9",
              disabled: isLoading,
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              name: "password",
              type: "password",
              placeholder: mode === "signUp" ? "Password (min 8 characters)" : "Password",
              className: "pl-9",
              disabled: isLoading,
              required: true,
              minLength: 8
            }
          )
        ] }),
        "            ",
        error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-red-500", children: error })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardFooter, { className: "flex-col gap-2 pb-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "submit", className: "w-full", disabled: isLoading, children: [
          isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }),
          mode === "signIn" ? "Sign in" : "Register"
        ] }),
        mode === "signUp" && error && error.includes("already registered") && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            variant: "link",
            className: "h-auto p-0 text-xs",
            onClick: () => {
              setMode("signIn");
              setError(null);
            },
            children: "Go to sign in"
          }
        ),
        mode === "signIn" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            variant: "link",
            className: "h-auto p-0 text-xs",
            onClick: () => {
              setMode("reset");
              setError(null);
            },
            children: "Forgot password?"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: mode === "signIn" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          "Need an account?",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              variant: "link",
              className: "p-0 h-auto",
              onClick: () => {
                setMode("signUp");
                setError(null);
              },
              children: "Register"
            }
          )
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          "Already have an account?",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              variant: "link",
              className: "p-0 h-auto",
              onClick: () => {
                setMode("signIn");
                setError(null);
              },
              children: "Sign in"
            }
          )
        ] }) })
      ] })
    ] })
  ] });
}
function AuthPage(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Auth, { ...props }) });
}

export { AuthPage as default };
