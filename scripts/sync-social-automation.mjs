import {writeFile} from 'node:fs/promises';
import {collectAutomation} from './lib/social-automation.mjs';
const result=await collectAutomation({token:process.env.GITHUB_TOKEN});
await writeFile(new URL('../data/social-automation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log('Social automation status refreshed.');
