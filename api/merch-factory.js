// Vercel serverless function: READ-ONLY preflight, never submits a paid order.
// npm install @supabase/supabase-js
const { createClient } = require('@supabase/supabase-js');
const API = 'https://www.merchfactory.in/api/v1';
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  try {
    const token = (req.headers.authorization || '').match(/^Bearer (.+)$/)?.[1];
    if (!token) return res.status(401).json({error:'Admin login required'});
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const mfKey = process.env.MF_API_KEY;
    if (![url, anon, service, mfKey].every(Boolean)) throw new Error('Server environment variables are missing');
    const auth = createClient(url, anon, {global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
    const {data:{user},error:userError} = await auth.auth.getUser(token);
    if (userError || !user) return res.status(401).json({error:'Invalid login'});
    const {data:isAdmin,error:adminError} = await auth.rpc('is_velzo_admin');
    if (adminError || isAdmin !== true) return res.status(403).json({error:'Admin access denied'});
    const id = String(req.body?.order_id || '');
    if (!id || id.length > 100) return res.status(400).json({error:'Invalid order ID'});
    const db = createClient(url, service, {auth:{persistSession:false}});
    const {data:order,error:orderError} = await db.from('orders').select('id,items,total,status,customer_address,cancellation_request_status').eq('id',id).single();
    if (orderError || !order) return res.status(404).json({error:'Order not found'});
    const {data:payments,error:paymentError} = await db.from('payment_confirmations').select('*').eq('order_id',id);
    if (paymentError) throw paymentError;
    const paid = (payments || []).some(p => p.status === 'Paid');
    const items = Array.isArray(order.items) ? order.items : [];
    const mapped=[]; const missing=[];
    for (const item of items) {
      const productId=String(item.id || item.product_id || '');
      const size=String(item.size || '');
      const color=String(item.color || '');
      const {data:sku,error:skuError} = await db.from('merch_factory_skus').select('sku').eq('velzo_product_id',productId).eq('size',size).eq('color',color).maybeSingle();
      if (skuError) throw skuError;
      if (!sku) missing.push({product_id:productId,size,color});
      else mapped.push({sku:sku.sku,quantity:Number(item.qty || item.quantity || 1)});
    }
    const response = await fetch(API+'/products?limit=1',{headers:{Authorization:`Bearer ${mfKey}`}});
    if (!response.ok) throw new Error('Merch Factory product API returned '+response.status);
    return res.status(200).json({mode:'READ_ONLY',order_id:id,order_status:order.status,payment_verified:paid,cancellation_status:order.cancellation_request_status || null,mapped_items:mapped,missing_mappings:missing,missing_checkout_fields:['customer email','address1','address2 / landmark','pincode (structured)'],merch_factory_api_connected:true,can_submit:false,note:'No order has been sent or charged.'});
  } catch (e) {return res.status(500).json({error:e.message || 'Unexpected error'});}
};
