import math
NEON=["#00E5FF","#3D7BFF","#8A5CFF","#FF3CAC","#FF8A3D","#FFD93D","#3DFFA0"]
PASTEL=["#62D4E3","#6F9CF5","#9A88EE","#DE7FBA","#EC9F73","#E6C872","#7FD9AE"]
def hx(c):return [int(c[i:i+2],16) for i in (1,3,5)]
PAL=["#%02x%02x%02x"%tuple((a+b)//2 for a,b in zip(hx(n),hx(p))) for n,p in zip(NEON,PASTEL)]
def col(t):
    t%=1;n=len(PAL);x=t*n;i=int(x);f=x-i
    a=hx(PAL[i%n]);b=hx(PAL[(i+1)%n])
    return "#%02x%02x%02x"%tuple(round(a[k]+(b[k]-a[k])*f) for k in range(3))
def pt(cx,cy,r,deg):
    a=math.radians(deg-90);return cx+r*math.cos(a),cy+r*math.sin(a)
def ring(cx,cy,r,w,start,end,shift,seg=2.0):
    out=[];d=start
    while d<end-1e-6:
        e=min(d+seg+0.8,end)
        x1,y1=pt(cx,cy,r,d);x2,y2=pt(cx,cy,r,e)
        out.append(f'<path d="M{x1:.2f} {y1:.2f}A{r} {r} 0 0 1 {x2:.2f} {y2:.2f}" stroke="{col(d/360+shift)}"/>')
        d+=seg
    caps=''
    if end-start<359:
        for dd in (start,end):
            x,y=pt(cx,cy,r,dd);caps+=f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{w/2}" fill="{col(dd/360+shift)}"/>'
    return f'<g fill="none" stroke-width="{w}">'+''.join(out)+'</g>'+caps
def mark(u=''):
    body=ring(256,282,150,52,38,322,0.0)+ring(256,282,72,30,0,362,0.0)+f'<circle cx="256" cy="74" r="40" fill="url(#orb{u})"/>'
    return f'''<defs><radialGradient id="orb{u}" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff"/><stop offset="0.35" stop-color="#8FEFFA"/><stop offset="1" stop-color="{PAL[2]}"/></radialGradient>
<filter id="glow{u}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter></defs>
<g filter="url(#glow{u})" opacity="0.5">{body}</g>{body}'''
def svg(w,h,body):return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>'
sc=lambda s:f'<g transform="translate(256 256) scale({s}) translate(-256 -256)">'
M=mark()
open('icon.svg','w',encoding='utf8').write(svg(512,512,sc(0.92)+M+'</g>'))
def tile(bg):return svg(512,512,f'<rect width="512" height="512" rx="112" fill="{bg}"/>'+sc(0.8)+M+'</g>')
open('icon-dark.svg','w',encoding='utf8').write(tile('#0D0E12'))
open('icon-light.svg','w',encoding='utf8').write(tile('#F4F5F7'))

TG=["#00E5FF","#3D7BFF","#8A5CFF","#FF3CAC","#FF8A3D","#FFD93D","#3DFFA0"]
stops=''.join(f'<stop offset="{i/(len(TG)-1):.3f}" stop-color="{c}"/>' for i,c in enumerate(TG))
T='font-family="\'Segoe UI\',\'Microsoft JhengHei\',\'Microsoft YaHei\',Arial,sans-serif"'
def title(x,y,s):
    return (f'<g {T} font-size="96" font-weight="800">'
      f'<text x="{x}" y="{y}" fill="url(#tg)" filter="url(#t1)" opacity="0.95">{s}</text>'
      f'<text x="{x}" y="{y}" fill="url(#tg)" filter="url(#t2)">{s}</text>'
      f'<text x="{x}" y="{y}" fill="#fff">{s}</text></g>')
LANGS={'en':("Multi-account Antigravity models for DeepSeek Harness","Auto-switch  ·  Live quota  ·  Zero-config"),
 'zh-TW':("為 DeepSeek Harness 提供多帳號 Antigravity 模型","自動切換  ·  即時額度  ·  本機零配置"),
 'zh-CN':("为 DeepSeek Harness 提供多账号 Antigravity 模型","自动切换  ·  实时额度  ·  本机零配置")}
M2=mark('b')
for k,(l1,l2) in LANGS.items():
    ban=f'''<defs><linearGradient id="tg" gradientUnits="userSpaceOnUse" x1="400" y1="0" x2="1180" y2="0">{stops}</linearGradient>
<filter id="t1" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="t2" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="4"/></filter>
<radialGradient id="bgl" cx="0.5" cy="0.4" r="0.8"><stop offset="0" stop-color="#14161F"/><stop offset="1" stop-color="#050609"/></radialGradient></defs>
<rect width="1280" height="640" fill="url(#bgl)"/>
<g transform="translate(110 100) scale(0.52)">{M2}</g>
{title(390,272,"Antigravity Next")}
<g {T} fill="#F2F4F8" text-anchor="middle">
<text x="700" y="392" font-size="34" font-weight="600">{l1}</text>
<text x="700" y="452" font-size="30" fill-opacity="0.7">{l2}</text></g>'''
    open(f'banner-{k}.svg','w',encoding='utf8').write(svg(1280,640,ban))
