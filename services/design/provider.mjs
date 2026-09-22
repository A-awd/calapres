import { normalizeName } from './security.mjs';
export const layouts = [
  'A low, wide horizontal composition with sweeping connected strokes.',
  'A tall vertical composition with carefully stacked word parts.',
  'A compact rounded composition formed entirely by the letters themselves, no enclosing circle.',
  'An upward diagonal composition with elegant long letter strokes.',
  'An open airy composition with generous negative space between valid connected letter groups.',
  'A dense square-like interwoven composition, without a square border.',
  'A flowing composition with a prominent low baseline and short upper letter forms.',
  'A balanced two-level composition preserving the natural reading order.',
  'An asymmetrical composition with a restrained long terminal flourish that remains part of a letter.'
];
export function designPrompt(name,index){
  return `Create one original Arabic calligraphic name artwork for acrylic printing. The exact name is ${JSON.stringify(normalizeName(name))}. Render only this name, preserving every letter, essential dot and original hamza. No tashkeel, decorative diacritics, extra words, symbols, frames, objects, mockups, shadows or watermarks. Black ink on plain white, flat high contrast, generous margins. Maintain correct Arabic joining, legibility and right-to-left reading. Artistically compose and interweave valid letterforms; do not merely typeset a common font. Layout direction: ${layouts[index%layouts.length]} Deliver a single composition, not a contact sheet.`;
}
export function openAIProvider({apiKey='',model='gpt-image-2',fetchImpl=fetch,timeoutMs=120000}={}){
  return {
    ready:!!apiKey,
    async generate(name,index){
      if(!apiKey)throw Error('PROVIDER_DISABLED');
      const response=await fetchImpl('https://api.openai.com/v1/images/generations',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},
        body:JSON.stringify({model,prompt:designPrompt(name,index),n:1,size:'1024x1024',quality:'low',output_format:'png',background:'opaque'}),
        signal:AbortSignal.timeout(timeoutMs)
      });
      // Never retry a possibly billed request or log provider payloads/credentials.
      if(!response.ok)throw Error('PROVIDER_FAILED');
      const reader=response.body.getReader();const chunks=[];let bytes=0;
      for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>8*1024*1024){await reader.cancel();throw Error('IMAGE_TOO_LARGE');}chunks.push(value);}
      const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(data.data?.length!==1||typeof data.data[0].b64_json!=='string')throw Error('PROVIDER_FAILED');
      return Buffer.from(data.data[0].b64_json,'base64');
    }
  };
}
