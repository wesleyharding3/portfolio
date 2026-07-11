/* Boot-up: earth00's lattice materialize fills each half (diag left, edges
   right), then both heroes install onto the scaffold as high-resolution
   triangulated skins — the obelisk sweeping from the top-left corner, the
   circuit board from the top-right, each toward the seam. Once dressed, the
   mock storefront nav fades in and hovering the front half plays its wind
   loop. Click (off the nav) or press R to replay. */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
  var intro = document.querySelector(".intro");
  if (!intro || !window.requestAnimationFrame) return;

  var canvas = document.createElement("canvas");
  canvas.className = "bootfx"; canvas.setAttribute("aria-hidden", "true");
  intro.insertBefore(canvas, intro.querySelector(".seam"));
  var ctx = canvas.getContext("2d");

  // energy-flow overlay for the board half — its own layer so the settled
  // boot frame beneath never needs repainting
  var flow = document.createElement("canvas");
  flow.className = "flowfx"; flow.setAttribute("aria-hidden", "true");
  intro.insertBefore(flow, intro.querySelector(".seam"));
  var fctx = flow.getContext("2d");

  // ---- timeline --------------------------------------------------------------
  var LOAD_START = 0.73, DUR = 0.87;        // lattice draw
  var SKIN_DELAY = 0.12, SKIN_DUR = 0.8;    // heroes install onto the scaffold
  var SHARD_FADE = 0.075;                   // each shard's own fade
  var NAV_H = 62;                           // matches --nav-h
  // the front half's hover rotation — add {still, video} pairs and they join in
  var FRONT_HEROES = [
    { still: "assets/img/hero/frontend-obelisk.jpg", video: "assets/img/hero/frontend-obelisk.mp4" }
  ];
  var HEROES = [
    { src: FRONT_HEROES[0].still,               anchor: "center" }, // left
    { src: "assets/img/hero/backend-board.jpg", anchor: "bottom" }  // right
  ];
  HEROES.forEach(function (hz) { hz.img = new Image(); hz.img.src = hz.src; });

  // ---- geometry: dense lattice (unchanged) ------------------------------------
  var STEPS = 6, GP = [];
  for (var g = 0; g <= STEPS; g++) GP.push(-1 + 2 * g / STEPS);
  function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

  function buildLattice(seed) {
    var L = [], EPS = 1e-6;
    function is1(v){return Math.abs(Math.abs(v)-1)<EPS;} function is0(v){return Math.abs(v)<EPS;}
    function mk(ax, u, w) {
      var a = {}, b = {};
      if (ax==="x"){ a={x:-1,y:u,z:w}; b={x:1,y:u,z:w}; }
      else if (ax==="y"){ a={x:u,y:-1,z:w}; b={x:u,y:1,z:w}; }
      else { a={x:u,y:w,z:-1}; b={x:u,y:w,z:1}; }
      var fx=(is1(u)?1:0)+(is1(w)?1:0);
      var central=is0(u)&&is0(w), edge=(fx===2), cross=(fx===1&&(is0(u)||is0(w)));
      var op,sw;
      if(central){op=0.92;sw=0.9;} else if(edge){op=0.42;sw=0.7;} else if(cross){op=0.30;sw=0.5;} else {op=0.12;sw=0.4;}
      L.push({a:a,b:b,baseOp:op,baseSw:sw,edge:edge});
    }
    for (var i=0;i<GP.length;i++) for (var j=0;j<GP.length;j++){ mk("x",GP[i],GP[j]); mk("y",GP[i],GP[j]); mk("z",GP[i],GP[j]); }
    var rnd = mulberry(seed);
    L.forEach(function(l){
      var mx=(l.a.x+l.b.x)/2,my=(l.a.y+l.b.y)/2,mz=(l.a.z+l.b.z)/2;
      l.rMid=Math.hypot(mx,my,mz)/1.7320508;
      l.diagA=((l.a.x+l.a.y+l.a.z)+3)/6; l.diagB=((l.b.x+l.b.y+l.b.z)+3)/6;
      l.mid={x:mx,y:my,z:mz};
    });
    var eds=L.filter(function(l){return l.edge;});
    eds.sort(function(A,B){function sc(l){var m=l.mid,band=m.z<-0.5?0:m.z>0.5?2:1;return band*10+(Math.atan2(m.y,m.x)+Math.PI);}return sc(A)-sc(B);});
    eds.forEach(function(l,i){l.edgeOrd=i;}); L._edgeN=eds.length||1;
    return L;
  }

  var ELV=0.5, FOCAL=5.2;
  function proj(p, S) {
    var ca=Math.cos(S.az), sa=Math.sin(S.az);
    var x=p.x*ca+p.z*sa, z=-p.x*sa+p.z*ca, y=p.y;
    var ce=Math.cos(ELV), se=Math.sin(ELV);
    var y2=y*ce-z*se, z2=y*se+z*ce, s=FOCAL/(FOCAL-z2);
    return { sx:S.cx+x*s*S.spread, sy:S.cy-y2*s*S.spread };
  }
  function clamp01(v){return v<0?0:v>1?1:v;}
  function smooth(v){v=clamp01(v);return v*v*(3-2*v);}
  function easeOut(v){v=clamp01(v);return 1-(1-v)*(1-v);}
  var FAINT = 0.42;

  var W,H,DPR,systems=[],skins=[];
  function build() {
    DPR=Math.min(window.devicePixelRatio||1,2);
    W=intro.clientWidth; H=intro.clientHeight;
    canvas.width=W*DPR; canvas.height=H*DPR; canvas.style.width=W+"px"; canvas.style.height=H+"px";
    ctx.setTransform(DPR,0,0,DPR,0,0);
    flow.width=W*DPR; flow.height=H*DPR; flow.style.width=W+"px"; flow.style.height=H+"px";
    fctx.setTransform(DPR,0,0,DPR,0,0);
    flowGeomCache=null;
    var hw=W/2, spread=Math.min(hw,H)*0.72;
    systems=[
      { style:"diag",  cx:hw*0.5, cy:H/2, az:0.72,  spread:spread, clip:[0,0,hw,H],  L:buildLattice(1337) },
      { style:"edges", cx:hw*1.5, cy:H/2, az:-0.72, spread:spread, clip:[hw,0,hw,H], L:buildLattice(4242) }
    ];
    skins=[ makeSkin(0, hw, H, HEROES[0], 0), makeSkin(hw, hw, H, HEROES[1], W) ];
  }

  // ---- triangulated skins: one per half, sweeping from the OUTER top corner ---
  function makeSkin(x0, hw, h, hero, originX) {
    var cols = 16, cell = hw / cols, rows = Math.ceil(h / cell);
    var tris = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var x = x0 + c * cell, y = r * cell, alt = (r + c) % 2 === 0;
      var p1=[x,y],p2=[x+cell,y],p3=[x+cell,y+cell],p4=[x,y+cell];
      [ alt?[p1,p2,p3]:[p1,p2,p4], alt?[p1,p3,p4]:[p2,p3,p4] ].forEach(function (t) {
        var cx=(t[0][0]+t[1][0]+t[2][0])/3, cy=(t[0][1]+t[1][1]+t[2][1])/3;
        tris.push({ pts:t, cx:cx, cy:cy, done:false });
      });
    }
    var maxD = 0;
    tris.forEach(function (t) { t.d=Math.hypot(t.cx-originX, t.cy); if(t.d>maxD)maxD=t.d; });
    tris.forEach(function (t) { t.delay=(t.d/maxD)*0.76; });

    var src = document.createElement("canvas");
    src.width = Math.round(hw*DPR); src.height = Math.round(h*DPR);
    var sctx = src.getContext("2d"); sctx.setTransform(DPR,0,0,DPR,0,0);
    var settled = document.createElement("canvas");
    settled.width = src.width; settled.height = src.height;
    var stctx = settled.getContext("2d"); stctx.setTransform(DPR,0,0,DPR,0,0);

    var skin = { x0:x0, hw:hw, h:h, tris:tris, src:src, settled:settled, stctx:stctx, srcReady:false };
    skin.paintSrc = function () {
      var im = hero.img;
      if (!im.complete || !im.naturalWidth) return false;
      var sc=Math.max(hw/im.naturalWidth, h/im.naturalHeight);
      var sw=hw/sc, sh=h/sc, sx=(im.naturalWidth-sw)/2;
      var sy = hero.anchor==="bottom" ? im.naturalHeight-sh : (im.naturalHeight-sh)/2;
      skin.crop = { sx:sx, sy:sy, sw:sw, sh:sh, iw:im.naturalWidth, ih:im.naturalHeight };
      sctx.clearRect(0,0,hw,h);
      sctx.drawImage(im, sx,sy,sw,sh, 0,0,hw,h);
      return true;
    };
    return skin;
  }

  function pathTri(c2, t, dx) {
    c2.beginPath(); c2.moveTo(t.pts[0][0]-dx, t.pts[0][1]); c2.lineTo(t.pts[1][0]-dx, t.pts[1][1]); c2.lineTo(t.pts[2][0]-dx, t.pts[2][1]); c2.closePath();
  }

  function renderSkin(skin, p) {
    if (!skin.srcReady) { skin.srcReady = skin.paintSrc(); if (!skin.srcReady) return; }
    ctx.save();
    ctx.beginPath(); ctx.rect(skin.x0, NAV_H, skin.hw, skin.h - NAV_H); ctx.clip();
    ctx.drawImage(skin.settled, skin.x0, 0, skin.hw, skin.h);
    skin.tris.forEach(function (t) {
      if (t.done) return;
      var lt = (p - t.delay) / SHARD_FADE;
      if (lt <= 0) return;
      if (lt >= 1) {
        pathTri(skin.stctx, t, skin.x0); skin.stctx.save(); skin.stctx.clip();
        skin.stctx.drawImage(skin.src, 0, 0, skin.hw, skin.h); skin.stctx.restore();
        t.done = true; return;
      }
      var a = smooth(lt);
      ctx.save(); pathTri(ctx, t, 0); ctx.clip(); ctx.globalAlpha = a;
      ctx.drawImage(skin.src, skin.x0, 0, skin.hw, skin.h); ctx.restore();
      if (a < 0.95) { ctx.save(); pathTri(ctx, t, 0);
        ctx.strokeStyle = "rgba(130,130,130," + (0.22*(1-a)).toFixed(3) + ")"; ctx.lineWidth = 0.6; ctx.stroke(); ctx.restore(); }
    });
    ctx.restore();
  }

  // ---- lattice frame (unchanged styles) ---------------------------------------
  function drawSeg(a, b) { ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy); ctx.stroke(); }
  function lerp(A,B,t){ return { sx:A.sx+(B.sx-A.sx)*t, sy:A.sy+(B.sy-A.sy)*t }; }
  function renderSystem(S, p) {
    ctx.save();
    ctx.beginPath(); ctx.rect(S.clip[0],S.clip[1],S.clip[2],S.clip[3]); ctx.clip();
    ctx.lineCap="round";
    var L=S.L;
    for (var i=0;i<L.length;i++){
      var Ln=L[i], f=1,opMul=1,glow=0,startA=true,seg=null;
      if (S.style==="diag"){
        var front=p*1.14, dN=Math.min(Ln.diagA,Ln.diagB), dF=Math.max(Ln.diagA,Ln.diagB);
        startA=Ln.diagA<=Ln.diagB; f=clamp01((front-dN)/Math.max(1e-4,dF-dN));
        opMul=smooth(clamp01((front-dN)/0.10)); var mid=(dN+dF)/2;
        glow=(front>dN&&front<dF+0.06)?clamp01(1-Math.abs(front-mid)/0.28):0;
      } else {
        if (Ln.edge){ var A0=0.14,B0=0.58,w=(B0-A0)/L._edgeN,s0=A0+Ln.edgeOrd*w;
          if(p<s0){f=0;opMul=0;}else{f=clamp01((p-s0)/w);startA=(Ln.a.x+Ln.a.y+Ln.a.z)<=(Ln.b.x+Ln.b.y+Ln.b.z);glow=(f<1?0.9:0);} }
        else { var C0=0.5; if(p<C0){f=0;opMul=0;}else{var u=clamp01((p-C0)/0.5);var s1=clamp01(u*1.25-Ln.rMid*0.16);var gg=0.5*easeOut(s1);seg=gg;f=1;opMul=(s1>0?1:0);glow=(s1>0.02&&s1<0.98)?0.5:0;} }
      }
      if (opMul<=0) continue;
      var A=proj(Ln.a,S), B=proj(Ln.b,S);
      var alpha=clamp01(Ln.baseOp*opMul*FAINT*(1+glow*1.1));
      if (alpha<=0.004) continue;
      var shade = glow>0.05 ? 96 : 150;
      ctx.strokeStyle="rgba("+shade+","+shade+","+shade+","+alpha.toFixed(3)+")";
      ctx.lineWidth=Ln.baseSw*(1+glow*1.2);
      if (seg!=null){ drawSeg(A, lerp(A,B,seg)); drawSeg(lerp(A,B,1-seg), B); }
      else { var sP=startA?A:B, eP=startA?B:A; drawSeg(sP, lerp(sP,eP,f)); }
    }
    ctx.restore();
  }

  // ---- energy flow: pulses ride the board's real traces on hover --------------
  // routes verbatim from mock/backend-board.html (board space, 1000x1250)
  var BOARD_W = 1000, BOARD_H = 1250;
  var FLOW_ROUTES = [
    // the amber query path — one request's life (brightest, chained phases)
    { k:"amber",  pts:[[205,204],[205,258],[150,258],[150,316]] },
    { k:"amber",  pts:[[235,408],[235,452],[300,452],[300,505],[360,505]] },
    { k:"amber",  pts:[[640,470],[700,470],[700,392],[740,392]] },
    { k:"amber",  pts:[[150,380],[86,380],[86,604],[110,604]] },      // trigger loop
    // copper relations
    { k:"copper", pts:[[285,160],[330,160],[330,123],[360,123]] },
    { k:"copper", pts:[[525,120],[572,120],[572,138],[620,138]] },
    { k:"copper", pts:[[790,180],[790,240],[830,240],[830,300]] },
    { k:"copper", pts:[[595,310],[650,310],[650,346],[740,346]] },
    { k:"copper", pts:[[320,360],[372,360],[372,310],[420,310]] },
    { k:"copper", pts:[[500,352],[500,430]] },
    { k:"copper", pts:[[240,408],[240,470],[360,470]] },
    { k:"copper", pts:[[640,505],[680,505],[680,589],[710,589]] },
    { k:"copper", pts:[[425,707],[350,707],[350,580],[360,560]] },
    { k:"copper", pts:[[56,160],[120,160]] },
    { k:"copper", pts:[[56,228],[92,228],[92,362],[150,362]] },
    { k:"copper", pts:[[920,346],[948,346]] },
    // replica bus — fast steady traffic
    { k:"bus",    pts:[[110,880],[850,880]] },
    { k:"bus",    pts:[[110,894],[850,894]] }
  ];
  var FLOW_STYLE = {
    amber:  { rgb:"199,127,31",  speed:150, pulses:2, r:2.2, tail:9 },
    copper: { rgb:"115,108,96",  speed:85,  pulses:1, r:1.7, tail:6 },
    bus:    { rgb:"70,66,58",    speed:300, pulses:3, r:1.5, tail:5 }
  };
  var flowGeomCache = null, flowOn = false, flowAlpha = 0, flowRAF = null, flowT0 = null;

  function buildFlowGeom() {
    var sk = skins[1];
    if (!sk || !sk.crop) return null;
    var c = sk.crop, kx = c.iw / BOARD_W, ky = c.ih / BOARD_H;
    function map(p) {
      return { x: sk.x0 + (p[0]*kx - c.sx) * (sk.hw / c.sw),
               y: (p[1]*ky - c.sy) * (sk.h / c.sh) };
    }
    var seed = mulberry(9090);
    return FLOW_ROUTES.map(function (r, ri) {
      var pts = r.pts.map(map), cum = [0], L = 0;
      for (var i = 1; i < pts.length; i++) { L += Math.hypot(pts[i].x-pts[i-1].x, pts[i].y-pts[i-1].y); cum.push(L); }
      var st = FLOW_STYLE[r.k], pulses = [];
      for (var pn = 0; pn < st.pulses; pn++) pulses.push(seed());
      return { pts:pts, cum:cum, L:L, k:r.k, st:st, pulses:pulses, ri:ri };
    });
  }
  function pointAt(g, s) {
    if (s <= 0) return g.pts[0];
    if (s >= g.L) return g.pts[g.pts.length-1];
    for (var i = 1; i < g.cum.length; i++) {
      if (s <= g.cum[i]) {
        var f = (s - g.cum[i-1]) / (g.cum[i] - g.cum[i-1]);
        return { x: g.pts[i-1].x + (g.pts[i].x-g.pts[i-1].x)*f,
                 y: g.pts[i-1].y + (g.pts[i].y-g.pts[i-1].y)*f };
      }
    }
    return g.pts[g.pts.length-1];
  }
  function flowFrame(ts) {
    if (flowT0 == null) flowT0 = ts;
    var t = (ts - flowT0) / 1000;
    flowAlpha += ((flowOn ? 1 : 0) - flowAlpha) * 0.09;
    fctx.clearRect(0, 0, W, H);
    if (flowAlpha < 0.01 && !flowOn) { flowRAF = null; return; }
    if (!flowGeomCache) flowGeomCache = buildFlowGeom();
    if (flowGeomCache) {
      var sk = skins[1];
      fctx.save();
      fctx.beginPath(); fctx.rect(sk.x0, NAV_H, sk.hw, sk.h - NAV_H); fctx.clip();
      fctx.globalAlpha = flowAlpha;
      flowGeomCache.forEach(function (g) {
        var period = g.L / g.st.speed;
        g.pulses.forEach(function (ph) {
          var s = (((t / period) + ph) % 1) * g.L;
          // comet tail behind the head
          for (var i = g.st.tail; i >= 0; i--) {
            var p = pointAt(g, s - i * 5);
            var a = (1 - i / (g.st.tail + 1));
            fctx.fillStyle = "rgba(" + g.st.rgb + "," + (0.85 * a * a).toFixed(3) + ")";
            fctx.beginPath(); fctx.arc(p.x, p.y, g.st.r * (i === 0 ? 1 : 0.75), 0, 6.2832); fctx.fill();
          }
          // soft glow on the head
          var hp = pointAt(g, s);
          fctx.fillStyle = "rgba(" + g.st.rgb + ",0.10)";
          fctx.beginPath(); fctx.arc(hp.x, hp.y, g.st.r * 3.2, 0, 6.2832); fctx.fill();
        });
      });
      fctx.restore();
    }
    flowRAF = requestAnimationFrame(flowFrame);
  }
  function startFlow() {
    if (reduce) return;
    flowOn = true;
    if (!flowRAF) { flowT0 = null; flowRAF = requestAnimationFrame(flowFrame); }
  }
  function stopFlow() { flowOn = false; }   // loop fades itself out, then parks
  function killFlow() {
    flowOn = false; flowAlpha = 0;
    if (flowRAF) { cancelAnimationFrame(flowRAF); flowRAF = null; }
    fctx.clearRect(0, 0, W, H);
  }

  // ---- the dress: mock storefront nav + hover video ---------------------------
  var vid = document.querySelector(".half__video");
  function dress() {
    intro.classList.add("is-dressed");
    // no-hover devices get both halves' motion automatically once dressed
    if (!canHover && !reduce) {
      if (vid) { vid.play().catch(function(){}); intro.classList.add("is-playing"); }
      startFlow();
    }
  }
  function undress() {
    intro.classList.remove("is-dressed"); intro.classList.remove("is-playing");
    if (vid) { vid.pause(); try { vid.currentTime = 0; } catch(e){} }
    killFlow();
  }
  if (canHover) {
    // the .enter door overlays own the pointer now — listen there, not on the
    // halves buried beneath them
    var frontHalf = document.querySelector(".enter--front") || document.querySelector(".half--front");
    var backHalf = document.querySelector(".enter--back") || document.querySelector(".half--back");
    var fadeT;
    if (vid && frontHalf) {
      frontHalf.addEventListener("mouseenter", function () {
        if (!intro.classList.contains("is-dressed")) return;
        clearTimeout(fadeT);
        vid.play().catch(function(){}); intro.classList.add("is-playing");
      });
      frontHalf.addEventListener("mouseleave", function () {
        intro.classList.remove("is-playing");
        clearTimeout(fadeT);
        // let the crossfade back to the still finish, then rewind for a clean re-entry
        fadeT = setTimeout(function () { vid.pause(); try { vid.currentTime = 0; } catch(e){} }, 650);
      });
    }
    if (backHalf) {
      backHalf.addEventListener("mouseenter", function () {
        if (!intro.classList.contains("is-dressed")) return;
        startFlow();
      });
      backHalf.addEventListener("mouseleave", stopFlow);
    }
  }

  var start=null, stopped=false, finishAt=null;
  function frame(ts){
    if (stopped) return;
    if (start==null) start=ts;
    var t=(ts-start)/1000;
    var p=clamp01((t-LOAD_START)/DUR);
    var sp=clamp01((t-(LOAD_START+DUR+SKIN_DELAY))/SKIN_DUR);
    ctx.clearRect(0,0,W,H);
    if (t>=LOAD_START) systems.forEach(function(S){ renderSystem(S, p); });
    if (sp>0) skins.forEach(function(sk){ renderSkin(sk, sp); });
    var settledAll = sp>=1 && skins.every(function(sk){ return sk.srcReady && sk.tris.every(function(t2){return t2.done;}); });
    if (settledAll && finishAt==null) finishAt = t;
    if (finishAt != null) {
      // the dissolve: the triangulated composite crossfades into the clean
      // image — every shard seam and grid line melts away
      var fa = clamp01((t - finishAt) / 0.2);
      skins.forEach(function(sk){
        if (!sk.srcReady) return;
        ctx.save();
        ctx.beginPath(); ctx.rect(sk.x0, NAV_H, sk.hw, sk.h - NAV_H); ctx.clip();
        ctx.globalAlpha = fa;
        ctx.drawImage(sk.src, sk.x0, 0, sk.hw, sk.h);
        ctx.restore();
      });
      if (fa >= 1) { stopped=true; drawFinal(); dress(); return; }
    }
    requestAnimationFrame(frame);
  }

  function replay(){
    undress();
    start=null; stopped=false; finishAt=null;
    skins.forEach(function(sk){
      sk.tris.forEach(function(t){ t.done=false; });
      sk.stctx.clearRect(0,0,sk.hw,sk.h);
    });
    requestAnimationFrame(frame);
  }

  // ---- hero rotation (front half): idle crossfade to the next still ----------
  var frontIdx = 0;
  function rotateFront() {
    if (FRONT_HEROES.length < 2 || !stopped) return;
    if (intro.classList.contains("is-playing")) return;   // never swap mid-play
    var next = (frontIdx + 1) % FRONT_HEROES.length;
    var im = new Image(); im.src = FRONT_HEROES[next].still;
    im.onload = function () {
      if (!stopped) return;
      var sk = skins[0];
      var old = document.createElement("canvas");
      old.width = sk.src.width; old.height = sk.src.height;
      old.getContext("2d").drawImage(sk.src, 0, 0);
      frontIdx = next; HEROES[0].img = im;
      sk.srcReady = sk.paintSrc();                        // sk.src now holds the new still
      if (vid) { vid.src = FRONT_HEROES[next].video; vid.load(); }
      var t0 = null;
      function fade(ts) {
        if (!stopped) return;                             // a replay interrupted us
        if (t0 == null) t0 = ts;
        var fa = Math.min(1, (ts - t0) / 800);
        ctx.save();
        ctx.beginPath(); ctx.rect(sk.x0, NAV_H, sk.hw, sk.h - NAV_H); ctx.clip();
        ctx.drawImage(old, sk.x0, 0, sk.hw, sk.h);
        ctx.globalAlpha = fa; ctx.drawImage(sk.src, sk.x0, 0, sk.hw, sk.h);
        ctx.restore();
        if (fa < 1) requestAnimationFrame(fade);
      }
      requestAnimationFrame(fade);
    };
  }

  function drawFinal(){
    ctx.clearRect(0,0,W,H);
    systems.forEach(function(S){ renderSystem(S,1); });
    skins.forEach(function(sk){
      if (sk.paintSrc()) {
        ctx.save(); ctx.beginPath(); ctx.rect(sk.x0, NAV_H, sk.hw, sk.h - NAV_H); ctx.clip();
        ctx.drawImage(sk.src, sk.x0, 0, sk.hw, sk.h);
        ctx.restore();
      }
    });
  }

  build();
  if (reduce){
    var ready = function(){ drawFinal(); intro.classList.add("is-dressed"); };
    var pend = HEROES.filter(function(hz){ return !hz.img.complete; }).length;
    if (!pend) ready();
    else HEROES.forEach(function(hz){ hz.img.addEventListener("load", function(){ if(--pend<=0) ready(); }); });
    return;
  }
  // resize: rebuild geometry; if the intro already played, re-render its final
  // state — never replay a 7-second sequence because a window moved
  var rt; window.addEventListener("resize", function(){ clearTimeout(rt); rt=setTimeout(function(){
    build(); if (stopped) { drawFinal(); } else replay();
  }, 200); });
  // the halves are doors now (click = enter the chapters); replay lives on R
  window.addEventListener("keydown", function(e){ if(e.key==="r"||e.key==="R") replay(); });
  if (FRONT_HEROES.length > 1) setInterval(rotateFront, 9000);
  requestAnimationFrame(frame);
})();
