import { describe, expect, it } from 'vitest';
import { POST } from '../app/api/analyze/route';
describe('analyze route',()=>{it('rejects blank request body',async()=>{const res=await POST(new Request('http://x/api/analyze',{method:'POST',body:JSON.stringify({brief:'   '})}));expect(res.status).toBe(400);});it('rejects large request body',async()=>{const res=await POST(new Request('http://x/api/analyze',{method:'POST',body:JSON.stringify({brief:'x'.repeat(9000)})}));expect(res.status).toBe(400);});});
