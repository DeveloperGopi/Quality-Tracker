import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, Q as Search, a2 as Download, c5 as CirclePlus, Z as Upload, c6 as Clock, B as Building2 } from './icons-BxQpodNr.js';
import { v as composeRefs, c as cn, b as useNavigate, l as useQuery, j as api } from './index-CBV6wOh8.js';
import { bC as useId, bR as Dialog, bW as DialogPortal, bX as DialogOverlay, bS as DialogContent, N as NAV_ITEMS, ct as navIcon } from './AppShell-CP099uvN.js';
import { P as Primitive } from './label-BaPkqXdo.js';
import { D as Dialog$1, b as DialogHeader, c as DialogTitle, d as DialogDescription, a as DialogContent$1 } from './dialog-BW3GEiPg.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './shareLink-_K-oJu5R.js';

var U=1,Y$1=.9,H=.8,J=.17,p=.1,u=.999,$=.9999;var k$1=.99,m=/[\\\/_+.#"@\[\(\{&]/,B$1=/[\\\/_+.#"@\[\(\{&]/g,K$1=/[\s-]/,X=/[\s-]/g;function G(_,C,h,P,A,f,O){if(f===C.length)return A===_.length?U:k$1;var T=`${A},${f}`;if(O[T]!==void 0)return O[T];for(var L=P.charAt(f),c=h.indexOf(L,A),S=0,E,N,R,M;c>=0;)E=G(_,C,h,P,c+1,f+1,O),E>S&&(c===A?E*=U:m.test(_.charAt(c-1))?(E*=H,R=_.slice(A,c-1).match(B$1),R&&A>0&&(E*=Math.pow(u,R.length))):K$1.test(_.charAt(c-1))?(E*=Y$1,M=_.slice(A,c-1).match(X),M&&A>0&&(E*=Math.pow(u,M.length))):(E*=J,A>0&&(E*=Math.pow(u,c-A))),_.charAt(c)!==C.charAt(f)&&(E*=$)),(E<p&&h.charAt(c-1)===P.charAt(f+1)||P.charAt(f+1)===P.charAt(f)&&h.charAt(c-1)!==P.charAt(f))&&(N=G(_,C,h,P,c+1,f+2,O),N*p>E&&(E=N*p)),E>S&&(S=E),c=h.indexOf(L,c+1);return O[T]=S,S}function D(_){return _.toLowerCase().replace(X," ")}function W(_,C,h){return _=h&&h.length>0?`${_+" "+h.join(" ")}`:_,G(_,C,D(_),D(C),0,0,{})}

var N='[cmdk-group=""]',Y='[cmdk-group-items=""]',be='[cmdk-group-heading=""]',le='[cmdk-item=""]',ce=`${le}:not([aria-disabled="true"])`,Z="cmdk-item-select",T="data-value",Re=(r,o,n)=>W(r,o,n),ue=reactExports.createContext(void 0),K=()=>reactExports.useContext(ue),de=reactExports.createContext(void 0),ee=()=>reactExports.useContext(de),fe=reactExports.createContext(void 0),me=reactExports.forwardRef((r,o)=>{let n=L(()=>{var e,a;return {search:"",value:(a=(e=r.value)!=null?e:r.defaultValue)!=null?a:"",selectedItemId:void 0,filtered:{count:0,items:new Map,groups:new Set}}}),u=L(()=>new Set),c=L(()=>new Map),d=L(()=>new Map),f=L(()=>new Set),p=pe(r),{label:b,children:m,value:R,onValueChange:x,filter:C,shouldFilter:S,loop:A,disablePointerSelection:ge=false,vimBindings:j=true,...O}=r,$=useId(),q=useId(),_=useId(),I=reactExports.useRef(null),v=ke();k(()=>{if(R!==void 0){let e=R.trim();n.current.value=e,E.emit();}},[R]),k(()=>{v(6,ne);},[]);let E=reactExports.useMemo(()=>({subscribe:e=>(f.current.add(e),()=>f.current.delete(e)),snapshot:()=>n.current,setState:(e,a,s)=>{var i,l,g,y;if(!Object.is(n.current[e],a)){if(n.current[e]=a,e==="search")J(),z(),v(1,W);else if(e==="value"){if(document.activeElement.hasAttribute("cmdk-input")||document.activeElement.hasAttribute("cmdk-root")){let h=document.getElementById(_);h?h.focus():(i=document.getElementById($))==null||i.focus();}if(v(7,()=>{var h;n.current.selectedItemId=(h=M())==null?void 0:h.id,E.emit();}),s||v(5,ne),((l=p.current)==null?void 0:l.value)!==void 0){let h=a!=null?a:"";(y=(g=p.current).onValueChange)==null||y.call(g,h);return}}E.emit();}},emit:()=>{f.current.forEach(e=>e());}}),[]),U=reactExports.useMemo(()=>({value:(e,a,s)=>{var i;a!==((i=d.current.get(e))==null?void 0:i.value)&&(d.current.set(e,{value:a,keywords:s}),n.current.filtered.items.set(e,te(a,s)),v(2,()=>{z(),E.emit();}));},item:(e,a)=>(u.current.add(e),a&&(c.current.has(a)?c.current.get(a).add(e):c.current.set(a,new Set([e]))),v(3,()=>{J(),z(),n.current.value||W(),E.emit();}),()=>{d.current.delete(e),u.current.delete(e),n.current.filtered.items.delete(e);let s=M();v(4,()=>{J(),(s==null?void 0:s.getAttribute("id"))===e&&W(),E.emit();});}),group:e=>(c.current.has(e)||c.current.set(e,new Set),()=>{d.current.delete(e),c.current.delete(e);}),filter:()=>p.current.shouldFilter,label:b||r["aria-label"],getDisablePointerSelection:()=>p.current.disablePointerSelection,listId:$,inputId:_,labelId:q,listInnerRef:I}),[]);function te(e,a){var i,l;let s=(l=(i=p.current)==null?void 0:i.filter)!=null?l:Re;return e?s(e,n.current.search,a):0}function z(){if(!n.current.search||p.current.shouldFilter===false)return;let e=n.current.filtered.items,a=[];n.current.filtered.groups.forEach(i=>{let l=c.current.get(i),g=0;l.forEach(y=>{let h=e.get(y);g=Math.max(h,g);}),a.push([i,g]);});let s=I.current;V().sort((i,l)=>{var h,F;let g=i.getAttribute("id"),y=l.getAttribute("id");return ((h=e.get(y))!=null?h:0)-((F=e.get(g))!=null?F:0)}).forEach(i=>{let l=i.closest(Y);l?l.appendChild(i.parentElement===l?i:i.closest(`${Y} > *`)):s.appendChild(i.parentElement===s?i:i.closest(`${Y} > *`));}),a.sort((i,l)=>l[1]-i[1]).forEach(i=>{var g;let l=(g=I.current)==null?void 0:g.querySelector(`${N}[${T}="${encodeURIComponent(i[0])}"]`);l==null||l.parentElement.appendChild(l);});}function W(){let e=V().find(s=>s.getAttribute("aria-disabled")!=="true"),a=e==null?void 0:e.getAttribute(T);E.setState("value",a||void 0);}function J(){var a,s,i,l;if(!n.current.search||p.current.shouldFilter===false){n.current.filtered.count=u.current.size;return}n.current.filtered.groups=new Set;let e=0;for(let g of u.current){let y=(s=(a=d.current.get(g))==null?void 0:a.value)!=null?s:"",h=(l=(i=d.current.get(g))==null?void 0:i.keywords)!=null?l:[],F=te(y,h);n.current.filtered.items.set(g,F),F>0&&e++;}for(let[g,y]of c.current)for(let h of y)if(n.current.filtered.items.get(h)>0){n.current.filtered.groups.add(g);break}n.current.filtered.count=e;}function ne(){var a,s,i;let e=M();e&&(((a=e.parentElement)==null?void 0:a.firstChild)===e&&((i=(s=e.closest(N))==null?void 0:s.querySelector(be))==null||i.scrollIntoView({block:"nearest"})),e.scrollIntoView({block:"nearest"}));}function M(){var e;return (e=I.current)==null?void 0:e.querySelector(`${le}[aria-selected="true"]`)}function V(){var e;return Array.from(((e=I.current)==null?void 0:e.querySelectorAll(ce))||[])}function X(e){let s=V()[e];s&&E.setState("value",s.getAttribute(T));}function Q(e){var g;let a=M(),s=V(),i=s.findIndex(y=>y===a),l=s[i+e];(g=p.current)!=null&&g.loop&&(l=i+e<0?s[s.length-1]:i+e===s.length?s[0]:s[i+e]),l&&E.setState("value",l.getAttribute(T));}function re(e){let a=M(),s=a==null?void 0:a.closest(N),i;for(;s&&!i;)s=e>0?we(s,N):De(s,N),i=s==null?void 0:s.querySelector(ce);i?E.setState("value",i.getAttribute(T)):Q(e);}let oe=()=>X(V().length-1),ie=e=>{e.preventDefault(),e.metaKey?oe():e.altKey?re(1):Q(1);},se=e=>{e.preventDefault(),e.metaKey?X(0):e.altKey?re(-1):Q(-1);};return reactExports.createElement(Primitive.div,{ref:o,tabIndex:-1,...O,"cmdk-root":"",onKeyDown:e=>{var s;(s=O.onKeyDown)==null||s.call(O,e);let a=e.nativeEvent.isComposing||e.keyCode===229;if(!(e.defaultPrevented||a))switch(e.key){case "n":case "j":{j&&e.ctrlKey&&ie(e);break}case "ArrowDown":{ie(e);break}case "p":case "k":{j&&e.ctrlKey&&se(e);break}case "ArrowUp":{se(e);break}case "Home":{e.preventDefault(),X(0);break}case "End":{e.preventDefault(),oe();break}case "Enter":{e.preventDefault();let i=M();if(i){let l=new Event(Z);i.dispatchEvent(l);}}}}},reactExports.createElement("label",{"cmdk-label":"",htmlFor:U.inputId,id:U.labelId,style:Te},b),B(r,e=>reactExports.createElement(de.Provider,{value:E},reactExports.createElement(ue.Provider,{value:U},e))))}),he=reactExports.forwardRef((r,o)=>{var _,I;let n=useId(),u=reactExports.useRef(null),c=reactExports.useContext(fe),d=K(),f=pe(r),p=(I=(_=f.current)==null?void 0:_.forceMount)!=null?I:c==null?void 0:c.forceMount;k(()=>{if(!p)return d.item(n,c==null?void 0:c.id)},[p]);let b=ve(n,u,[r.value,r.children,u],r.keywords),m=ee(),R=P(v=>v.value&&v.value===b.current),x=P(v=>p||d.filter()===false?true:v.search?v.filtered.items.get(n)>0:true);reactExports.useEffect(()=>{let v=u.current;if(!(!v||r.disabled))return v.addEventListener(Z,C),()=>v.removeEventListener(Z,C)},[x,r.onSelect,r.disabled]);function C(){var v,E;S(),(E=(v=f.current).onSelect)==null||E.call(v,b.current);}function S(){m.setState("value",b.current,true);}if(!x)return null;let{disabled:A,value:ge,onSelect:j,forceMount:O,keywords:$,...q}=r;return reactExports.createElement(Primitive.div,{ref:composeRefs(u,o),...q,id:n,"cmdk-item":"",role:"option","aria-disabled":!!A,"aria-selected":!!R,"data-disabled":!!A,"data-selected":!!R,onPointerMove:A||d.getDisablePointerSelection()?void 0:S,onClick:A?void 0:C},r.children)}),Ee=reactExports.forwardRef((r,o)=>{let{heading:n,children:u,forceMount:c,...d}=r,f=useId(),p=reactExports.useRef(null),b=reactExports.useRef(null),m=useId(),R=K(),x=P(S=>c||R.filter()===false?true:S.search?S.filtered.groups.has(f):true);k(()=>R.group(f),[]),ve(f,p,[r.value,r.heading,b]);let C=reactExports.useMemo(()=>({id:f,forceMount:c}),[c]);return reactExports.createElement(Primitive.div,{ref:composeRefs(p,o),...d,"cmdk-group":"",role:"presentation",hidden:x?void 0:true},n&&reactExports.createElement("div",{ref:b,"cmdk-group-heading":"","aria-hidden":true,id:m},n),B(r,S=>reactExports.createElement("div",{"cmdk-group-items":"",role:"group","aria-labelledby":n?m:void 0},reactExports.createElement(fe.Provider,{value:C},S))))}),ye=reactExports.forwardRef((r,o)=>{let{alwaysRender:n,...u}=r,c=reactExports.useRef(null),d=P(f=>!f.search);return !n&&!d?null:reactExports.createElement(Primitive.div,{ref:composeRefs(c,o),...u,"cmdk-separator":"",role:"separator"})}),Se=reactExports.forwardRef((r,o)=>{let{onValueChange:n,...u}=r,c=r.value!=null,d=ee(),f=P(m=>m.search),p=P(m=>m.selectedItemId),b=K();return reactExports.useEffect(()=>{r.value!=null&&d.setState("search",r.value);},[r.value]),reactExports.createElement(Primitive.input,{ref:o,...u,"cmdk-input":"",autoComplete:"off",autoCorrect:"off",spellCheck:false,"aria-autocomplete":"list",role:"combobox","aria-expanded":true,"aria-controls":b.listId,"aria-labelledby":b.labelId,"aria-activedescendant":p,id:b.inputId,type:"text",value:c?r.value:f,onChange:m=>{c||d.setState("search",m.target.value),n==null||n(m.target.value);}})}),Ce=reactExports.forwardRef((r,o)=>{let{children:n,label:u="Suggestions",...c}=r,d=reactExports.useRef(null),f=reactExports.useRef(null),p=P(m=>m.selectedItemId),b=K();return reactExports.useEffect(()=>{if(f.current&&d.current){let m=f.current,R=d.current,x,C=new ResizeObserver(()=>{x=requestAnimationFrame(()=>{let S=m.offsetHeight;R.style.setProperty("--cmdk-list-height",S.toFixed(1)+"px");});});return C.observe(m),()=>{cancelAnimationFrame(x),C.unobserve(m);}}},[]),reactExports.createElement(Primitive.div,{ref:composeRefs(d,o),...c,"cmdk-list":"",role:"listbox",tabIndex:-1,"aria-activedescendant":p,"aria-label":u,id:b.listId},B(r,m=>reactExports.createElement("div",{ref:composeRefs(f,b.listInnerRef),"cmdk-list-sizer":""},m)))}),xe=reactExports.forwardRef((r,o)=>{let{open:n,onOpenChange:u,overlayClassName:c,contentClassName:d,container:f,...p}=r;return reactExports.createElement(Dialog,{open:n,onOpenChange:u},reactExports.createElement(DialogPortal,{container:f},reactExports.createElement(DialogOverlay,{"cmdk-overlay":"",className:c}),reactExports.createElement(DialogContent,{"aria-label":r.label,"cmdk-dialog":"",className:d},reactExports.createElement(me,{ref:o,...p}))))}),Ie=reactExports.forwardRef((r,o)=>P(u=>u.filtered.count===0)?reactExports.createElement(Primitive.div,{ref:o,...r,"cmdk-empty":"",role:"presentation"}):null),Pe=reactExports.forwardRef((r,o)=>{let{progress:n,children:u,label:c="Loading...",...d}=r;return reactExports.createElement(Primitive.div,{ref:o,...d,"cmdk-loading":"",role:"progressbar","aria-valuenow":n,"aria-valuemin":0,"aria-valuemax":100,"aria-label":c},B(r,f=>reactExports.createElement("div",{"aria-hidden":true},f)))}),_e=Object.assign(me,{List:Ce,Item:he,Input:Se,Group:Ee,Separator:ye,Dialog:xe,Empty:Ie,Loading:Pe});function we(r,o){let n=r.nextElementSibling;for(;n;){if(n.matches(o))return n;n=n.nextElementSibling;}}function De(r,o){let n=r.previousElementSibling;for(;n;){if(n.matches(o))return n;n=n.previousElementSibling;}}function pe(r){let o=reactExports.useRef(r);return k(()=>{o.current=r;}),o}var k=typeof window=="undefined"?reactExports.useEffect:reactExports.useLayoutEffect;function L(r){let o=reactExports.useRef();return o.current===void 0&&(o.current=r()),o}function P(r){let o=ee(),n=()=>r(o.snapshot());return reactExports.useSyncExternalStore(o.subscribe,n,n)}function ve(r,o,n,u=[]){let c=reactExports.useRef(),d=K();return k(()=>{var b;let f=(()=>{var m;for(let R of n){if(typeof R=="string")return R.trim();if(typeof R=="object"&&"current"in R)return R.current?(m=R.current.textContent)==null?void 0:m.trim():c.current}})(),p=u.map(m=>m.trim());d.value(r,f,p),(b=o.current)==null||b.setAttribute(T,f),c.current=f;}),c}var ke=()=>{let[r,o]=reactExports.useState(),n=L(()=>new Map);return k(()=>{n.current.forEach(u=>u()),n.current=new Map;},[r]),(u,c)=>{n.current.set(u,c),o({});}};function Me(r){let o=r.type;return typeof o=="function"?o(r.props):"render"in o?o.render(r.props):r}function B({asChild:r,children:o},n){return r&&reactExports.isValidElement(o)?reactExports.cloneElement(Me(o),{ref:o.ref},n(o.props.children)):n(o)}var Te={position:"absolute",width:"1px",height:"1px",padding:"0",margin:"-1px",overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",borderWidth:"0"};

function Command({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    _e,
    {
      "data-slot": "command",
      className: cn(
        "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
        className
      ),
      ...props
    }
  );
}
function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = true,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog$1, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { className: "sr-only", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: description })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DialogContent$1,
      {
        className: cn("overflow-hidden p-0", className),
        showCloseButton,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Command, { className: "[&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5", children })
      }
    )
  ] });
}
function CommandInput({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-slot": "command-input-wrapper",
      className: "flex h-9 items-center gap-2 border-b px-3",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "size-4 shrink-0 opacity-50" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          _e.Input,
          {
            "data-slot": "command-input",
            className: cn(
              "placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
              className
            ),
            ...props
          }
        )
      ]
    }
  );
}
function CommandList({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    _e.List,
    {
      "data-slot": "command-list",
      className: cn(
        "max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto",
        className
      ),
      ...props
    }
  );
}
function CommandEmpty({
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    _e.Empty,
    {
      "data-slot": "command-empty",
      className: "py-6 text-center text-sm",
      ...props
    }
  );
}
function CommandGroup({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    _e.Group,
    {
      "data-slot": "command-group",
      className: cn(
        "text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
        className
      ),
      ...props
    }
  );
}
function CommandSeparator({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    _e.Separator,
    {
      "data-slot": "command-separator",
      className: cn("bg-border -mx-1 h-px", className),
      ...props
    }
  );
}
function CommandItem({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    _e.Item,
    {
      "data-slot": "command-item",
      className: cn(
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      ),
      ...props
    }
  );
}

const RECENT_KEY = "nqas.palette.recent";
const MAX_RECENT = 6;
const PAGES = [
  { to: "/dashboard", label: "Dashboard", group: "Pages", hint: "KPIs and the district pipeline" },
  { to: "/system-map", label: "System Map", group: "Pages", hint: "How the tracker works: flow, specs, pages and tools" },
  { to: "/facilities", label: "Facility Master List", group: "Pages", hint: "The full tracker sheet" },
  { to: "/facilities/state-assessment", label: "State Assessment", group: "Pages" },
  { to: "/facilities/certification", label: "NQAS Certification", group: "Pages" },
  { to: "/facilities/recertification", label: "Recertification", group: "Pages" },
  { to: "/facilities/internal-assessment", label: "Internal Assessment", group: "Pages" },
  { to: "/facilities/fund", label: "Gap Closure Fund", group: "Pages" },
  { to: "/facilities/building", label: "Building", group: "Pages" },
  { to: "/facilities/fire-noc", label: "Fire NOC", group: "Pages" },
  { to: "/reports", label: "Reports & Export", group: "Pages", hint: "Excel, PDF, CSV, print" },
  { to: "/reports?tab=linelists", label: "Line lists", group: "Pages", hint: "Topic-wise facility lists with a summary and download" },
  { to: "/summary-report", label: "NQAS Summary Report", group: "Pages" },
  { to: "/custom-report", label: "Custom Report Builder", group: "Pages" },
  { to: "/generate-ppt", label: "Generate PPT", group: "Pages" },
  { to: "/pending", label: "Pending & Follow-up", group: "Pages", hint: "Missing, not updated, overdue and conflicting facilities" },
  { to: "/block-compare", label: "Block Compare", group: "Pages", hint: "Compare blocks on certification, IA, documents and issues" },
  { to: "/links", label: "Links Organiser", group: "Pages", hint: "Report and data-collection links" },
  { to: "/documents", label: "Documents", group: "Pages", hint: "Every current facility document, with open, download and ZIP" },
  { to: "/guide", label: "Admin Guide", group: "Pages", hint: "How every page works, with context help" },
  { to: "/profile", label: "My profile", group: "Pages", hint: "Account, preferences, activity" },
  { to: "/bulk-import", label: "Bulk Import", group: "Admin pages" },
  { to: "/bulk-import?tab=mapping", label: "SaQsham status mapping", group: "Admin pages" },
  { to: "/admin", label: "Admin Settings", group: "Admin pages" }
];
function PageIcon({ to }) {
  const Icon = navIcon(to) ?? Building2;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "mr-1.5 size-3.5 text-muted-foreground", "aria-hidden": true });
}
function readRecents() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}
function rememberRecent(entry) {
  try {
    const next = [
      {
        ...entry,
        label: entry.label ?? entry.to
      },
      ...readRecents().filter((e) => e.id !== entry.id)
    ].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
  }
}
function clearRecents() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
  }
}
function facilityHaystack(row) {
  return [
    row.facility.name,
    row.facility.block,
    row.facility.facilityType,
    row.facility.phc ?? "",
    row.facility.ninNumber ?? "",
    row.facility.saqshamCategory ?? ""
  ].join(" ").toLowerCase();
}
function matchParts(text, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [{ hit: false, text }];
  const lower = text.toLowerCase();
  const parts = [];
  let i = 0;
  while (i < text.length) {
    const at = lower.indexOf(q, i);
    if (at < 0) {
      parts.push({ hit: false, text: text.slice(i) });
      break;
    }
    if (at > i) parts.push({ hit: false, text: text.slice(i, at) });
    parts.push({ hit: true, text: text.slice(at, at + q.length) });
    i = at + q.length;
  }
  return parts.length ? parts : [{ hit: false, text }];
}
function Highlight({ text, query }) {
  const parts = matchParts(text, query);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: parts.map(
    (p, i) => p.hit ? /* @__PURE__ */ jsxRuntimeExports.jsx("mark", { className: "rounded-sm bg-primary/15 font-semibold text-primary", children: p.text }, i) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: p.text }, i)
  ) });
}
function CommandPalette({
  open,
  onOpenChange,
  isAdmin,
  isEditor,
  appRole,
  adminHidden
}) {
  const [internalOpen, setInternalOpen] = reactExports.useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = (o) => {
    setInternalOpen(o);
    onOpenChange?.(o);
  };
  const [search, setSearch] = reactExports.useState("");
  const navigate = useNavigate();
  const listRows = useQuery(
    api.ops.listFacilityRowsFast,
    isOpen ? {} : "skip"
  );
  const linkRows = useQuery(api.links.palette, isOpen ? {} : "skip");
  const customPages = useQuery(api.pages.nav, isOpen ? {} : "skip");
  const pageOverrides = useQuery(
    api.pages.builtinOverrides,
    isOpen ? {} : "skip"
  );
  const settingsQ = useQuery(api.facilities.getAppSettings, isOpen ? {} : "skip");
  const hiddenPages = reactExports.useMemo(() => {
    const pages2 = settingsQ?.settings.hiddenPages;
    const categories = settingsQ?.settings.hiddenCategories;
    return /* @__PURE__ */ new Set([
      ...Array.isArray(pages2) ? pages2 : [],
      ...Array.isArray(categories) ? categories : []
    ]);
  }, [settingsQ]);
  const [recentsOverride, setRecentsOverride] = reactExports.useState(null);
  const recents = recentsOverride ?? (isOpen ? readRecents() : []);
  const cmdEnter = reactExports.useRef(false);
  const q = search.trim().toLowerCase();
  const facilityRows = reactExports.useMemo(() => {
    const rows = listRows?.rows ?? [];
    if (!q) return rows.slice(0, 12);
    const compact = q.replace(/\s/g, "");
    return rows.filter((row) => {
      const hay = facilityHaystack(row);
      if (!q) return false;
      if (hay.includes(q)) return true;
      return !!(compact && (row.facility.ninNumber ?? "").replace(/\s/g, "").includes(compact));
    }).slice(0, 12);
  }, [listRows, q]);
  const pages = reactExports.useMemo(() => {
    const custom = (customPages ?? []).map((p) => ({
      to: `/p/${p.slug}`,
      label: p.name,
      group: "Pages",
      hint: "Custom page"
    }));
    const base = [...PAGES, ...custom].filter((p) => {
      const over = pageOverrides?.[p.to];
      if (p.to.startsWith("/p/")) return true;
      if (p.to === "/admin") return true;
      if (over?.visible === false) return false;
      const item = NAV_ITEMS.find((n) => n.to === p.to);
      const hiddenKey = item?.visibilityKey ?? p.to.replace(/^\//, "");
      if (p.to !== "/admin" && (hiddenPages.has(hiddenKey) || hiddenPages.has(p.to.replace(/^\//, ""))))
        return false;
      if (p.to === "/guide" && !over && appRole !== "admin") return false;
      if (over?.everyone) return true;
      if (over?.roles?.length) return !!appRole && over.roles.includes(appRole);
      if (item?.defaultRoles?.length)
        return !!appRole && item.defaultRoles.includes(appRole);
      return true;
    }).map((p) => {
      const over = pageOverrides?.[p.to];
      return over?.label?.trim() ? { ...p, label: over.label.trim() } : p;
    });
    return adminHidden ? base.map(
      (p) => p.to === "/admin" ? { ...p, label: "Admin settings (hidden)", hint: "Hidden from the sidebar — still opens here" } : p
    ) : base;
  }, [adminHidden, appRole, customPages, hiddenPages, isAdmin, pageOverrides]);
  const pageItems = reactExports.useMemo(
    () => pages.filter((p) => isAdmin ? true : p.group !== "Admin pages").filter(
      (p) => !q || p.label.toLowerCase().includes(q) || p.to.includes(q)
    ),
    [q, isAdmin, pages]
  );
  const linkItems = reactExports.useMemo(() => {
    const rows = linkRows ?? [];
    return rows.filter(
      (link) => !q || `${link.title} ${link.categoryName} ${link.serial}`.toLowerCase().includes(q)
    ).slice(0, q ? 12 : 6);
  }, [linkRows, q]);
  const actions = reactExports.useMemo(
    () => [
      {
        id: "action-export",
        label: "Export data",
        icon: Download,
        to: "/reports",
        hint: "Excel, PDF, CSV — build the export"
      },
      { id: "action-add", label: "Add facility", icon: CirclePlus, to: "/facilities?add=1", hint: "New facility record" },
      ...isEditor ? [
        {
          id: "action-add-link",
          label: "Add link",
          icon: CirclePlus,
          to: "/links?add=1",
          hint: "New report or data-collection link"
        },
        {
          id: "action-import-links",
          label: "Import links",
          icon: Upload,
          to: "/links?import=1",
          hint: "Paste or upload the Links sheet"
        }
      ] : [],
      ...isEditor ? [
        {
          id: "action-import",
          label: "Start import",
          icon: Upload,
          to: "/bulk-import",
          hint: "Import facility / assessment data"
        }
      ] : []
    ].filter((a) => !q || a.label.toLowerCase().includes(q)),
    [q, isEditor]
  );
  const recentPages = reactExports.useMemo(() => {
    if (q) return [];
    const map = new Map(pages.map((p) => [p.to, p.label]));
    return recents.filter((r) => r.type === "page" && map.has(r.to) && r.to !== "/facilities").map((r) => ({ ...r, label: map.get(r.to) ?? r.label }));
  }, [recents, q, pages]);
  const runTo = (to, opts = {}) => {
    setOpen(false);
    setSearch("");
    if (opts.remember) {
      rememberRecent({ ...opts.remember, to });
      setRecentsOverride([]);
    }
    navigate(to);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    CommandDialog,
    {
      open: isOpen,
      onOpenChange: (o) => {
        setOpen(o);
        if (!o) {
          setSearch("");
          setRecentsOverride(null);
        }
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          onKeyDown: (e) => {
            if (e.key === "Enter") cmdEnter.current = e.metaKey || e.ctrlKey;
          },
          onKeyUp: () => {
            cmdEnter.current = false;
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              CommandInput,
              {
                placeholder: "Search pages or facilities",
                value: search,
                onValueChange: setSearch
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CommandList, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(CommandEmpty, { children: [
                "No facility or page matches “",
                search,
                "”."
              ] }),
              !q && recentPages.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(CommandGroup, { heading: "Recent", children: recentPages.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                CommandItem,
                {
                  value: `recent ${r.label}`,
                  onSelect: () => runTo(r.to, {
                    remember: { type: "page", id: r.id, label: r.label, to: r.to }
                  }),
                  className: "text-sm",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "mr-1.5 size-3.5 text-muted-foreground" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1", children: r.label })
                  ]
                },
                `r-${r.id}`
              )) }),
              pageItems.filter((p) => p.group === "Pages").length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(CommandGroup, { heading: "Pages", children: pageItems.filter((p) => p.group === "Pages").map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                CommandItem,
                {
                  value: `page ${p.label} ${p.to}`,
                  onSelect: () => runTo(p.to, {
                    remember: { type: "page", id: p.to, label: p.label, to: p.to }
                  }),
                  className: "text-sm",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(PageIcon, { to: p.to }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Highlight, { text: p.label, query: search })
                  ]
                },
                p.to
              )) }),
              actions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(CommandGroup, { heading: "Actions", children: actions.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                CommandItem,
                {
                  value: `action ${a.label}`,
                  onSelect: () => runTo(a.to, {
                    remember: { type: "page", id: a.id, label: a.label, to: a.to }
                  }),
                  className: "text-sm",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(a.icon, { className: "mr-1.5 size-3.5 text-muted-foreground" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Highlight, { text: a.label, query: search }),
                      a.hint && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-xs text-muted-foreground", children: a.hint })
                    ] })
                  ]
                },
                a.id
              )) }),
              (isAdmin ? pageItems.filter((p) => p.group === "Admin pages").length : 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CommandSeparator, {}),
                /* @__PURE__ */ jsxRuntimeExports.jsx(CommandGroup, { heading: "Admin pages", children: pageItems.filter((p) => p.group === "Admin pages").map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  CommandItem,
                  {
                    value: `page ${p.label} ${p.to}`,
                    onSelect: () => runTo(p.to, {
                      remember: { type: "page", id: p.to, label: p.label, to: p.to }
                    }),
                    className: "text-sm",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(PageIcon, { to: p.to }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Highlight, { text: p.label, query: search })
                    ]
                  },
                  p.to
                )) })
              ] }),
              linkItems.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CommandSeparator, {}),
                /* @__PURE__ */ jsxRuntimeExports.jsx(CommandGroup, { heading: `Links${q ? ` — ${linkItems.length}` : " (recent names)"}`, children: linkItems.map((link) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  CommandItem,
                  {
                    value: `link ${link.title} ${link.categoryName} ${link.serial}`,
                    onSelect: () => {
                      const to = `/links?item=${link.id}`;
                      setOpen(false);
                      setSearch("");
                      rememberRecent({
                        type: "page",
                        id: `link:${link.id}`,
                        label: link.title,
                        to
                      });
                      navigate(to);
                    },
                    className: "text-sm",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(PageIcon, { to: "/links" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1 truncate", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Highlight, { text: link.title, query: search }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2 text-xs text-muted-foreground", children: [
                          link.categoryName,
                          " · S. No ",
                          link.serial
                        ] })
                      ] })
                    ]
                  },
                  link.id
                )) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(CommandSeparator, {}),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                CommandGroup,
                {
                  heading: listRows ? `Facilities${q ? ` — ${facilityRows.length} of ${listRows.rows.length}` : ` (${listRows.rows.length} total)`}` : "Facilities",
                  children: facilityRows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    CommandItem,
                    {
                      value: `facility ${facilityHaystack(row)}`,
                      onSelect: () => {
                        if (cmdEnter.current) {
                          runTo(`/facilities/${row.facility._id}`, {
                            remember: {
                              type: "facility",
                              id: row.facility._id,
                              label: row.facility.name,
                              to: `/facilities/${row.facility._id}`
                            }
                          });
                          return;
                        }
                        const remember = {
                          type: "facility",
                          id: row.facility._id,
                          label: row.facility.name,
                          to: `/facilities?facility=${row.facility._id}`
                        };
                        setOpen(false);
                        setSearch("");
                        rememberRecent(remember);
                        navigate(`/facilities?facility=${row.facility._id}`);
                      },
                      className: "text-sm",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1 truncate", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Highlight, { text: row.facility.name, query: search }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2 text-xs text-muted-foreground", children: [
                            row.facility.facilityType,
                            " · ",
                            row.facility.block,
                            row.facility.phc ? ` · ${row.facility.phc}` : "",
                            row.facility.saqshamCategory ? ` · ${row.facility.saqshamCategory}` : ""
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-xs text-muted-foreground", children: row.facility.currentStatus })
                      ]
                    },
                    row.facility._id
                  ))
                }
              )
            ] })
          ]
        }
      )
    }
  );
}

export { CommandPalette, Highlight, clearRecents, matchParts, readRecents, rememberRecent };
