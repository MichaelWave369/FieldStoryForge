import React, { useMemo, useRef, useState } from 'react';
import { layoutStory } from './rung2.js';
import { newId } from './story.js';

const WIDTH=182, HEIGHT=72;
export default function StoryMap({ story, onUpdate, onEdit }) {
  const generated=useMemo(()=>layoutStory(story),[story.scenes,story.start]);
  const [drag,setDrag]=useState(null);
  const [connecting,setConnecting]=useState(false);
  const [origin,setOrigin]=useState(null);
  const [notice,setNotice]=useState('');
  const svgRef=useRef(null), wasDragged=useRef(false);
  const coords={...generated,...story.mapPositions,...(drag ? {[drag.id]:{x:drag.x,y:drag.y}} : {})};
  const maxX=Math.max(1060,...Object.values(coords).map(p=>p.x+WIDTH+50));
  const maxY=Math.max(460,...Object.values(coords).map(p=>p.y+HEIGHT+60));
  const all=story.scenes;
  const handleNode=(id)=>{
    if(wasDragged.current) {wasDragged.current=false;return;}
    if(!connecting) {onEdit(id);return;}
    if(!origin) {setOrigin(id);setNotice('Choose the destination scene to connect.');return;}
    const source=all.find(s=>s.id===origin), target=all.find(s=>s.id===id);
    if(!source || !target) return;
    if(source.ending) {setNotice('An ending scene cannot have outgoing choices. Unmark it as an ending first.');setOrigin(null);return;}
    if(source.choices.length>=12) {setNotice('A scene can have a maximum of 12 choices.');setOrigin(null);return;}
    const choice={id:newId('choice'),text:'Go to '+target.title,to:id,condition:null,effect:null};
    onUpdate(s=>({...s,scenes:s.scenes.map(p=>p.id===origin?{...p,choices:[...p.choices,choice]}:p)}));
    setNotice('Choice created: '+source.title+' → '+target.title+'. Edit its label in Pages & choices.');
    setOrigin(null);
  };
  const svgPoint=(event)=>{
    const svg=svgRef.current;
    if(!svg) return {x:0,y:0};
    const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
    const matrix=svg.getScreenCTM();
    if(!matrix) return {x:0,y:0};
    const p=point.matrixTransform(matrix.inverse());
    return {x:p.x,y:p.y};
  };
  const startDrag=(event,id)=>{
    if(connecting)return;
    if(event.button!==0)return;
    const node=coords[id],p=svgPoint(event);
    wasDragged.current=false;
    setDrag({id,x:node.x,y:node.y,startX:node.x,startY:node.y,offsetX:p.x-node.x,offsetY:p.y-node.y});
    svgRef.current?.setPointerCapture(event.pointerId);
  };
  const move=(event)=>{
    if(!drag)return;
    const p=svgPoint(event);
    const x=Math.max(5,Math.min(4750,p.x-drag.offsetX)),y=Math.max(5,Math.min(4750,p.y-drag.offsetY));
    if(Math.abs(x-drag.startX)>4||Math.abs(y-drag.startY)>4) wasDragged.current=true;
    setDrag({...drag,x,y});
  };
  const stop=(event)=>{
    if(!drag)return;
    const final=drag;
    if(wasDragged.current) onUpdate(s=>({...s,mapPositions:{...s.mapPositions,[final.id]:{x:final.x,y:final.y}}}));
    else onEdit(final.id);
    setDrag(null);
    try{if(svgRef.current?.hasPointerCapture(event.pointerId))svgRef.current.releasePointerCapture(event.pointerId);}catch{ /* capture may have ended */ }
  };
  const reset=()=>{onUpdate(s=>({...s,mapPositions:{}}));setNotice('Automatic map layout restored.');};
  return <section className="story-map-editor">
    <div className="map-toolbar"><p className="subtle">Drag scenes to arrange them. Click a scene to edit it. Use connection mode to link two scenes.</p><div className="inline-actions">
      <button className={'button-small '+(connecting?'button-primary':'button-outline')} onClick={()=>{setConnecting(!connecting);setOrigin(null);setNotice('');}}>{connecting?'✓ Finish connecting':'+ Connect scenes'}</button>
      <button className="button-small button-ghost" onClick={reset}>Reset positions</button>
    </div></div>
    {connecting&&<div className="map-status" role="status">{origin?'Choose a destination for '+(all.find(s=>s.id===origin)?.title||origin):'Click the starting scene, then click the destination scene.'}</div>}
    {notice&&<div className="map-status" role="status">{notice}</div>}
    <div className="map-scroll" tabIndex={0} aria-label="Scrollable branching story graph">
      <svg ref={svgRef} viewBox={'0 0 '+maxX+' '+maxY} width={maxX} height={maxY} aria-label="Interactive story scene graph" onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} className="graph-svg">
        <defs>
          <marker id="graph-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#d8ab8a"/></marker>
          <pattern id="graph-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#84728b" opacity=".27"/></pattern>
        </defs>
        <rect x="0" y="0" width={maxX} height={maxY} fill="url(#graph-dots)"/>
        {all.flatMap(page=>(page.choices||[]).filter(c=>coords[c.to]).map(c=>{
          const a=coords[page.id],b=coords[c.to], ax=a.x+WIDTH/2, ay=a.y+HEIGHT, bx=b.x+WIDTH/2,by=b.y;
          const bend=by>ay+20?Math.min(80,(by-ay)/2):60;
          return <g key={page.id+'-'+c.id}><path d={'M'+ax+' '+ay+' C'+ax+' '+(ay+bend)+' '+bx+' '+(by-bend)+' '+bx+' '+by} fill="none" stroke="#c49883" strokeOpacity=".7" strokeWidth="2" markerEnd="url(#graph-arrow)" /></g>;
        }))}
        {all.map(page=>{
          const p=coords[page.id],selected=origin===page.id;
          return <g key={page.id} role="button" tabIndex={0} aria-label={'Scene '+page.title+(page.ending?', ending':'')+', click to '+(connecting?'connect':'edit')} onPointerDown={e=>startDrag(e,page.id)} onClick={()=>{if(connecting)handleNode(page.id);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleNode(page.id);}}} className={'map-node'+(selected?' map-node-selected':'')}>
            <rect x={p.x} y={p.y} width={WIDTH} height={HEIGHT} rx="13" fill={selected?'#655172':page.ending?'#415b55':page.id===story.start?'#745b4c':'#30304b'} stroke={selected?'#f4d39b':'#bba2a4'} strokeWidth={selected?3:1.5}/>
            <text x={p.x+13} y={p.y+19} fontSize="10" fill="#ead2a6">{page.id===story.start?'⌂ START':page.ending?'✦ ENDING':(page.choices?.length||0)+' CHOICES'}</text>
            <text x={p.x+13} y={p.y+43} fontSize="13" fill="#fff4ea" fontWeight="700">{page.title.length>21?page.title.slice(0,20)+'…':page.title}</text>
            <text x={p.x+13} y={p.y+59} fontSize="10" fill="#d3bac3">{page.id.slice(0,26)}</text>
          </g>;
        })}
      </svg>
    </div>
    <p className="subtle">The graph is an authoring view, not a separate story engine. All links use the same validated choice graph as the reader.</p>
  </section>;
}
