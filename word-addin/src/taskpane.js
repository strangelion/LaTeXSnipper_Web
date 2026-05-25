import './taskpane.css';
import { preprocessLatexForTypst, cleanPandocTypstArtifacts, looksLikeLatexMath } from './typst-utils';

// Debug
var _dbg=[],_loadStep=0,_loadTotal=5;
function log(m){_dbg.push(new Date().toLocaleTimeString()+' '+m);if(_dbg.length>200)_dbg.shift();var el=$('#debugPanel');if(el)el.textContent=_dbg.join('\n')}
function setProg(step,msg){_loadStep=step;var b=$('#loadBar');if(b)b.style.width=(_loadStep/_loadTotal*100)+'%';var m=$('#loadMsg');if(m)m.textContent=msg;log(msg)}
document.addEventListener('keydown',function(e){if(e.ctrlKey&&e.shiftKey&&e.key==='D'){e.preventDefault();var el=$('#debugPanel');el.style.display=el.style.display==='none'?'block':'none'}});

// State
var mathfield=null,currentMode='latex',$typst=null,typstReady=false,mjReady=false;
var ocrLatex='',rtimer=null,xslDoc=null,_typstSource='';
var $=function(s){return document.querySelector(s)};var $$=function(s){return document.querySelectorAll(s)};

// Bootstrap
log('Boot: checking Office host...');
if (typeof Office!=='undefined') { Office.onReady(function(info){log('Office.onReady: '+(info&&info.host||'unknown'));boot()}); }
else { log('No Office.js, using DOMContentLoaded'); document.addEventListener('DOMContentLoaded',boot); }

async function boot(){
  setProg(1,'Loading MML2OMML...');
  await loadMML2OMML();
  setProg(2,'Loading MathLive...');
  await initMathLive();
  setProg(3,'Preparing Typst engine...');
  injectTypstTs();
  setProg(4,'Loading MathJax preview...');
  loadMathJax();
  bindEvents();buildTemplates();initOcrTab();initTheme();updateUI();
  setProg(5,'Ready');
  setTimeout(function(){var o=document.querySelector('#mathfield-host .loading-overlay');if(o)o.style.display='none'},400);
}

// MathLive: poll for global after <script type=module> sets it
async function initMathLive(){
  var n=0,MF;
  while(!(MF=window.MathfieldElement)&&n<150){await new Promise(function(r){setTimeout(r,100)});n++}
  if(!MF){log('MathLive not loaded');fallbackTextarea();return}
  mathfield=new MF();mathfield.tabIndex=0;mathfield.mathVirtualKeyboardPolicy='manual';mathfield.smartFence=true;mathfield.style.minHeight='52px';
  mathfield.addEventListener('input',debounceRender);
  mathfield.addEventListener('keydown',function(e){if(e.ctrlKey&&e.key==='Enter'){e.preventDefault();insertToWord()}});
  document.querySelector('#mathfield-host').innerHTML='';document.querySelector('#mathfield-host').appendChild(mathfield);
  log('MathLive OK');
}
function fallbackTextarea(){
  var ta=document.createElement('textarea');ta.id='fb-editor';ta.placeholder='e.g. \\frac{1}{2} + \\sqrt{x}';
  ta.style.cssText='width:100%;min-height:52px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:10px;font-size:14px;resize:vertical;font-family:monospace';
  ta.addEventListener('input',function(){debounceRender()});
  document.querySelector('#mathfield-host').innerHTML='';document.querySelector('#mathfield-host').appendChild(ta);
}
function getCurrentLatex(){return mathfield?(mathfield.getValue('latex-expanded')||'').trim():document.querySelector('#fb-editor')?.value?.trim()||''}

// MathJax lazy load
function loadMathJax(){
  if(mjReady||document.getElementById('mj'))return;
  var s=document.createElement('script');s.id='mj';s.src='https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js';
  s.addEventListener('load',function(){mjReady=true;log('MathJax OK');debounceRender()});document.head.appendChild(s);
  window.MathJax={tex:{inlineMath:[['$','$'],['\\(','\\)']],displayMath:[['$$','$$'],['\\[','\\]']]},svg:{fontCache:'global'},options:{enableMenu:false},startup:{typeset:false}};
}

// MML2OMML XSL
async function loadMML2OMML(){try{var r=await fetch('assets/MML2OMML.XSL');xslDoc=new DOMParser().parseFromString(await r.text(),'text/xml');log('XSL OK')}catch(e){log('XSL fail: '+e.message)}}

// typst.ts
function injectTypstTs(){
  var s=document.createElement('script');s.type='module';s.src='https://cdn.jsdelivr.net/npm/@myriaddreamin/typst.ts/dist/esm/contrib/all-in-one-lite.bundle.js';
  s.addEventListener('load',function(){$typst=window.$typst;if(!$typst){log('typst.ts: $typst not found');return}
    $typst.setCompilerInitOptions({getModule:function(){return'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm'}});
    $typst.setRendererInitOptions({getModule:function(){return'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm'}});
    var TS=window.TypstSnippet;if(TS){$typst.use(TS.preloadFontAssets({preloadFonts:['text']}));try{$typst.use(TS.preloadFontFromUrl('/fonts/NotoSerifCJKsc-Regular.otf'))}catch(_){}}
    typstReady=true;log('typst.ts OK');debounceRender()});document.head.appendChild(s);
}

// Mode/Tabs
function setMode(m){currentMode=m;$$('.mode-btn').forEach(function(b){b.classList.toggle('active',b.dataset.mode===m)});updateUI();debounceRender()}
function updateUI(){$('#copyTypstBtn').style.display=currentMode==='typst'?'':'none';$('#copyLatexBtn').style.display=currentMode==='typst'?'none':''}
function switchTab(t){$$('.tab').forEach(function(e){e.classList.toggle('active',e.id==='tab-'+t)});$$('.tb-btn').forEach(function(b){b.classList.toggle('active',b.dataset.tab===t)})}

// Render
function debounceRender(){clearTimeout(rtimer);rtimer=setTimeout(render,200)}
function render(){
  if(!mjReady){loadMathJax();$('#preview-out').innerHTML='<div class="hint">Loading preview engine...</div>';return}
  var latex=getCurrentLatex();if(!latex){$('#preview-out').innerHTML='<div class="hint">Enter a LaTeX formula</div>';$('#renderTime').textContent='';return}
  var t0=performance.now();
  if(currentMode==='typst'&&typstReady&&$typst){renderTypst(latex,t0)}else{renderMathJax(latex,t0)}
}
function renderMathJax(latex,t0){_typstSource='';$('#preview-out').innerHTML='$$'+latex+'$$';if(typeof MathJax!=='undefined'&&MathJax.typesetPromise)MathJax.typesetPromise([$('#preview-out')]).then(function(){$('#renderTime').textContent=(performance.now()-t0).toFixed(0)+'ms'})}
function renderTypst(latex,t0){try{var tc=looksLikeLatexMath(latex)?'$ '+preprocessLatexForTypst(latex)+' $':'$ '+cleanPandocTypstArtifacts(latex)+' $';_typstSource=tc;$typst.svg({mainContent:tc}).then(function(svg){$('#preview-out').innerHTML=cleanTypstSvg(svg);$('#renderTime').textContent=(performance.now()-t0).toFixed(0)+'ms'}).catch(function(e){$('#preview-out').innerHTML='<div style="color:var(--red)">Typst: '+e.message+'</div>'})}catch(e){$('#preview-out').innerHTML='<div style="color:var(--red)">'+e.message+'</div>'}}
function cleanTypstSvg(svg){var s=String(svg||'').trim();if(s.startsWith('<?xml')){var i=s.indexOf('>');if(i>=0)s=s.slice(i+1).trim()}s=s.replace(/\s+(fill|stroke)="(?:#[0-9a-fA-F]{3,8}|rgb\s*\([^)]*\)|rgba\s*\([^)]*\)|[a-zA-Z_][a-zA-Z0-9_]*)"/g,'');s=s.replace(/\s+(fill-opacity|stroke-opacity)="[^"]*"/g,'');s=s.replace(/\s*<path\b[^>]*\bd="M\s*0[\s,]+0[^"]*"\s*\/>/,'');s=s.replace(/(<svg\b[^>]*>)/,'$1<style>svg path,svg text,svg use,svg g{fill:currentColor!important;stroke:currentColor!important}</style>');return s}

// Insert OMML
function insertToWord(latexOverride){
  var latex=latexOverride||getCurrentLatex();if(!latex){toast('Please enter a formula');return}
  var omml=buildOMML(latex);
  log('insertToWord: Word='+(typeof Word!=='undefined')+', Office='+(typeof Office!=='undefined'));
  if(typeof Word!=='undefined'&&Word.run){Word.run(function(ctx){ctx.document.getSelection().insertOoxml(omml,'Replace');return ctx.sync()}).then(function(){toast('Inserted')}).catch(function(e){toast('Insert error: '+e.message);log('Word.run error: '+e.message)})}
  else if(typeof Office!=='undefined'&&Office.context&&Office.context.document){Office.context.document.setSelectedDataAsync(omml,{coercionType:'ooxml'},function(r){if(r.status==='succeeded')toast('Inserted');else{toast('Insert failed');log('setSelectedDataAsync: '+(r.error?r.error.message:''))}})}
  else{toast('Word API unavailable. Load this add-in inside Word.');log('No Word API available')}
}
function buildOMML(latex){
  // Try XSLT: MathLive MathML -> MML2OMML -> clean OMML
  if(mathfield&&xslDoc){try{var mathml=(typeof mathfield.exportToMathML==='function')?mathfield.exportToMathML():'';if(mathml&&mathml.indexOf('<math')>=0){var mmlDoc=new DOMParser().parseFromString(mathml,'text/xml');var proc=new XSLTProcessor();proc.importStylesheet(xslDoc);var result=proc.transformToDocument(mmlDoc);var omml=new XMLSerializer().serializeToString(result);// Strip XML declaration and processing instructionsomml=omml.replace(/<\?xml[^?]*\?>/g,'').trim();log('OMML via XSLT: '+omml.slice(0,100));return omml}}catch(e){log('XSLT error: '+e.message)}}
  // Fallback: minimal valid OMML
  var body=(latex||'').trim().replace(/^\$\$?\s*/,'').replace(/\s*\$\$?\s*$/,'');var o='<m:oMathPara xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:oMath><m:r><m:t>'+_xml(body)+'</m:t></m:r></m:oMath></m:oMathPara>';log('OMML fallback');return o;
}

// Copy
function copyLatex(){var t=getCurrentLatex();if(t)navigator.clipboard.writeText(t).then(function(){toast('Copied')}).catch(function(){toast('Copy failed')})}
function copyTypst(){var t=_typstSource||'';t=t.replace(/^\$\s*/,'').replace(/\s*\$\s*$/,'').trim();if(t)navigator.clipboard.writeText(t).then(function(){toast('Copied')}).catch(function(){toast('Copy failed')});else toast('Switch to Typst Preview mode first')}

// Templates
function buildTemplates(){
  var tpls=[{name:'Fraction',latex:'\\frac{#?}{#?}'},{name:'Square Root',latex:'\\sqrt{#?}'},{name:'Sub+Sup',latex:'x_{#?}^{#?}'},{name:'Sum',latex:'\\sum_{n=1}^{\\infty} #?'},{name:'Integral',latex:'\\int_{a}^{b} #?\\,dx'},{name:'Limit',latex:'\\lim_{x \\to \\infty} #?'},{name:'Matrix 2x2',latex:'\\begin{bmatrix} #? & #? \\\\\\ #? & #? \\end{bmatrix}'},{name:'Cases',latex:'\\begin{cases} #? & x>0 \\\\\\ #? & x\\leq 0 \\end{cases}'},{name:'Partial',latex:'\\frac{\\partial #?}{\\partial x}'},{name:'Binomial',latex:'\\binom{n}{k}'}];
  var grid=$('#tplGrid');tpls.forEach(function(t){var c=document.createElement('div');c.className='tpl-card';c.innerHTML='<div class="tpl-latex">'+_esc(t.latex)+'</div><div class="tpl-render">'+_esc(t.name)+'</div>';c.addEventListener('click',function(){switchTab('editor');if(mathfield){mathfield.insert(t.latex,{format:'latex'});mathfield.focus();debounceRender()}else{var ta=document.querySelector('#fb-editor');if(ta){ta.value+=' '+t.latex;debounceRender()}}});grid.appendChild(c)});
}

// Theme
function toggleTheme(){var r=document.documentElement,cur=r.getAttribute('data-theme'),next=cur==='light'?'dark':'light';r.setAttribute('data-theme',next);$('#themeBtn').textContent=next==='dark'?'Dark':'Light';try{localStorage.setItem('ls-office-theme',next)}catch(_){}}
function initTheme(){var s='dark';try{s=localStorage.getItem('ls-office-theme')||'dark'}catch(_){}document.documentElement.setAttribute('data-theme',s);$('#themeBtn').textContent=s==='dark'?'Dark':'Light'}

// Toast
var _tt=null;function toast(m){var e=$('#toast');e.textContent=m;e.classList.add('show');clearTimeout(_tt);_tt=setTimeout(function(){e.classList.remove('show')},2500)}

// Events
function bindEvents(){
  $$('.mode-btn').forEach(function(b){b.addEventListener('click',function(){setMode(b.dataset.mode)})});$$('.tb-btn').forEach(function(b){b.addEventListener('click',function(){switchTab(b.dataset.tab)})});
  $('#insertBtn').addEventListener('click',function(){insertToWord()});$('#copyLatexBtn').addEventListener('click',copyLatex);$('#copyTypstBtn').addEventListener('click',copyTypst);$('#themeBtn').addEventListener('click',toggleTheme);
  $('#ocrInsertBtn')?.addEventListener('click',function(){insertToWord(ocrLatex)});$('#ocrCopyBtn')?.addEventListener('click',function(){navigator.clipboard.writeText(ocrLatex).then(function(){toast('Copied')})});$('#ocrEditBtn')?.addEventListener('click',function(){switchTab('editor');if(mathfield){mathfield.setValue(ocrLatex,{silenceNotifications:true});debounceRender()}else{var ta=document.querySelector('#fb-editor');if(ta){ta.value=ocrLatex;debounceRender()}}});
}

// Helpers
function _esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function _xml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

// OCR (MathCraft ONNX, same as ocr_demo.html)
var ocrReady=false,encSession=null,decSession=null,tokenizerVocab=null,decStartId=2,eosId=2,padId=0;
function initOcrTab(){
  var dz=$('#dropZone'),fi=$('#fileInput'),pi=$('#previewImg');
  dz.addEventListener('click',function(){fi.click()});fi.addEventListener('change',function(){if(fi.files[0])handleFile(fi.files[0])});
  dz.addEventListener('dragover',function(e){e.preventDefault();dz.classList.add('drag')});dz.addEventListener('dragleave',function(){dz.classList.remove('drag')});
  dz.addEventListener('drop',function(e){e.preventDefault();dz.classList.remove('drag');if(e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0])});
  document.addEventListener('paste',function(e){if(!document.querySelector('#tab-ocr.active'))return;var items=e.clipboardData&&e.clipboardData.items;if(!items)return;for(var i=0;i<items.length;i++){if(items[i].type.startsWith('image/')){e.preventDefault();handleFile(items[i].getAsFile());return}}});
  function handleFile(file){if(!file||!file.type.startsWith('image/'))return;var reader=new FileReader();reader.onload=function(ev){pi.src=ev.target.result;pi.style.display='block';dz.querySelector('.dz-icon').style.display='none';dz.querySelector('.dz-title').style.display='none';dz.querySelector('.dz-hint').style.display='none';runOcr(ev.target.result)};reader.readAsDataURL(file)}
  async function runOcr(dataUrl){if(typeof ort==='undefined'){await injectOnnx()}try{if(!ocrReady){$('#ocrStatus').innerHTML='<span style="color:var(--accent)">Loading models (113MB)...</span>';await loadOcrModels()}$('#ocrStatus').innerHTML='<span style="color:var(--accent)">Recognizing...</span>';var img=new Image();img.src=dataUrl;await new Promise(function(r){img.onload=r});var cv=document.createElement('canvas');cv.width=384;cv.height=384;var ctx=cv.getContext('2d');ctx.drawImage(img,0,0,384,384);var id=ctx.getImageData(0,0,384,384),pv=new Float32Array(3*384*384);for(var i=0;i<384*384;i++){pv[i]=id.data[i*4]/255;pv[384*384+i]=id.data[i*4+1]/255;pv[2*384*384+i]=id.data[i*4+2]/255}var input=new ort.Tensor('float32',pv,[1,3,384,384]);var encOut=await encSession.run({[encSession.inputNames[0]]:input});var hs=encOut[encSession.outputNames[0]],maxTokens=256;var ids=new ort.Tensor('int64',BigInt64Array.from([BigInt(decStartId)]),[1,1]),tids=[];for(var s=0;s<maxTokens;s++){var decOut=await decSession.run({[decSession.inputNames[0]]:ids,[decSession.inputNames[1]]:hs});var logits=decOut[decSession.outputNames[0]],sl=logits.dims[1],vs=logits.dims[2];var last=Array.from(logits.data.slice((sl-1)*vs)),mi=0,mv=-Infinity;for(var j=0;j<last.length;j++){if(last[j]>mv){mv=last[j];mi=j}}if(mi===eosId||mi===padId)break;tids.push(mi);ids=new ort.Tensor('int64',BigInt64Array.from([...Array.from(ids.data),BigInt(mi)]),[1,sl+1])}ocrLatex=decodeTokens(tids);showOcrResult(ocrLatex);$('#ocrStatus').innerHTML='<span style="color:var(--green)">Done</span>'}catch(e){$('#ocrStatus').innerHTML='OCR error: '+e.message;log('OCR: '+e.message)}}
  function injectOnnx(){return new Promise(function(resolve){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort.all.min.js';s.addEventListener('load',resolve);document.head.appendChild(s)})}
  async function loadOcrModels(){var base='/models/mathcraft-formula-rec/';ort.env.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/';var tokResp=await fetch(base+'tokenizer.json'),tokData=await tokResp.json();tokenizerVocab={};for(var t in tokData.model.vocab)tokenizerVocab[tokData.model.vocab[t]]=t;var genResp=await fetch(base+'generation_config.json'),genData=await genResp.json();decStartId=genData.decoder_start_token_id||2;eosId=genData.eos_token_id||2;padId=genData.pad_token_id||0;var[encBuf,decBuf]=await Promise.all([fetch(base+'encoder_model.onnx').then(function(r){return r.arrayBuffer()}),fetch(base+'decoder_model.onnx').then(function(r){return r.arrayBuffer()})]);encSession=await ort.InferenceSession.create(encBuf,{executionProviders:['wasm']});decSession=await ort.InferenceSession.create(decBuf,{executionProviders:['wasm']});ocrReady=true;log('OCR models OK')}
  function decodeTokens(ids){if(!tokenizerVocab)return ids.join(',');var t='';for(var i=0;i<ids.length;i++){var tok=tokenizerVocab[ids[i]];if(!tok)continue;if(tok.startsWith('<')&&tok.endsWith('>'))continue;if(tok.startsWith('Ġ'))t+=' '+tok.slice(1);else if(tok.startsWith('▁'))t+=' '+tok.slice(1);else t+=tok}return t.trim()}
}
function showOcrResult(latex){$('#ocrOutput').textContent=latex;$('#ocrResult').style.display='block';var el=$('#ocrPreview');if(!el)return;el.innerHTML='$$'+latex+'$$';if(typeof MathJax!=='undefined'&&MathJax.typesetPromise)MathJax.typesetPromise([el])}
