/** A frame starts its network request only after its parent has attached the
 * lifecycle listener. This also avoids racing opaque-frame initialization. */
export function buildAdDocument(adKey: string, width: number, height: number, channel: string, fixtureOrigin?: string) {
  const safe = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
  const options = safe({ key: adKey, format: 'iframe', width, height, params: {} });
  const scriptUrl = fixtureOrigin === 'http://127.0.0.1:4010'
    ? `${fixtureOrigin}/ad-fixture/${adKey}/invoke.js`
    : `https://www.highperformanceformat.com/${adKey}/invoke.js`;
  return `<!doctype html><html><head><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:transparent}</style></head><body><script>
    const channel=${safe(channel)};
    let started=false;
    const report=state=>parent.postMessage({channel,state},'*');
    const rendered=()=>!!document.querySelector('iframe,img,a');
    const observer=new MutationObserver(()=>{if(rendered()){report('rendered');observer.disconnect()}});
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('message',event=>{
      if(event.source!==parent||event.data?.channel!==channel||event.data?.action!=='start')return;
      if(started){if(rendered())report('rendered');return;}
      started=true;
      window.atOptions=${options};
      const script=document.createElement('script');
      script.src=${safe(scriptUrl)};
      script.onerror=()=>report('failed');
      document.body.appendChild(script);
    });
  </script></body></html>`;
}
