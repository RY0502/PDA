import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export default async function StocksPage() {
  let targetCode = 'PVRINOX';
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('stock_code')
      .select('code')
      .order('updatedAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.code) {
      targetCode = data.code;
    }
  } catch (error) {
    console.error('Error fetching latest watched stock code:', error);
  }

  redirect(`/stocks/${targetCode}`);
}
