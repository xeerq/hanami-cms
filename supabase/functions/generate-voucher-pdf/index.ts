import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    if (req.method !== 'POST') {
      throw new Error('Only POST method allowed')
    }

    const { voucherId } = await req.json()
    
    if (!voucherId) {
      throw new Error('Voucher ID is required')
    }

    console.log(`Generating PDF for voucher: ${voucherId}`)

    // Fetch voucher data with related information
    const { data: voucher, error: voucherError } = await supabaseClient
      .from('vouchers')
      .select(`
        *,
        services(name, description)
      `)
      .eq('id', voucherId)
      .single()

    // Fetch profile data separately if user_id exists
    let userProfile = null
    if (voucher && voucher.user_id) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', voucher.user_id)
        .single()
      userProfile = profile
    }

    if (voucherError) {
      console.error('Error fetching voucher:', voucherError)
      throw new Error('Voucher not found')
    }

    console.log('Voucher data:', voucher)

    // Generate HTML content for the voucher
    const voucherOwner = userProfile?.first_name && userProfile?.last_name 
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : voucher.purchaser_name || 'Właściciel bonu'

    const serviceInfo = voucher.services?.name || 'Wszystkie usługi'
    const voucherValue = voucher.voucher_type === 'single' 
      ? `${voucher.original_value} zł`
      : `${voucher.original_sessions} sesji`

    const expiryDate = voucher.expires_at 
      ? new Date(voucher.expires_at).toLocaleDateString('pl-PL')
      : 'Bezterminowy'

    // Create HTML template for PDF that matches the uploaded voucher design
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {
                size: A4;
                margin: 15mm;
            }
            
            body {
                font-family: 'Times New Roman', serif;
                margin: 0;
                padding: 30px;
                background: white;
                color: black;
                line-height: 1.6;
            }
            
            .voucher-container {
                max-width: 700px;
                margin: 0 auto;
                background: white;
                padding: 40px;
                border: 2px solid #000;
                min-height: 80vh;
                position: relative;
            }
            
            .header {
                text-align: center;
                margin-bottom: 60px;
            }
            
            .salon-title {
                font-size: 48px;
                font-weight: normal;
                margin: 0;
                margin-bottom: 10px;
                letter-spacing: 2px;
            }
            
            .hanami-spa {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                margin: 20px 0;
            }
            
            .hanami-text {
                font-size: 64px;
                font-style: italic;
                font-weight: bold;
                color: #000;
                margin: 0;
            }
            
            .spa-text {
                font-size: 32px;
                color: #e91e63;
                font-weight: bold;
                margin: 0;
            }
            
            .flower-icon {
                color: #e91e63;
                font-size: 40px;
            }
            
            .subtitle {
                font-size: 24px;
                margin: 30px 0 60px 0;
                font-weight: normal;
            }
            
            .content {
                font-size: 20px;
                line-height: 2.5;
                margin: 40px 0;
            }
            
            .recipient-line {
                margin: 30px 0;
                border-bottom: 1px dotted #000;
                padding-bottom: 5px;
                min-height: 25px;
                display: flex;
                align-items: baseline;
            }
            
            .recipient-label {
                margin-right: 10px;
                white-space: nowrap;
            }
            
            .recipient-value {
                flex: 1;
                border-bottom: none;
                font-weight: bold;
            }
            
            .service-line {
                margin: 30px 0;
            }
            
            .value-line {
                margin: 30px 0;
                border-bottom: 1px dotted #000;
                padding-bottom: 5px;
                min-height: 25px;
                display: flex;
                align-items: baseline;
            }
            
            .value-label {
                margin-right: 10px;
                white-space: nowrap;
            }
            
            .value-amount {
                flex: 1;
                border-bottom: none;
                font-weight: bold;
            }
            
            .footer {
                position: absolute;
                bottom: 40px;
                left: 40px;
                right: 40px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                font-size: 16px;
            }
            
            .contact-info {
                text-align: left;
                line-height: 1.4;
            }
            
            .validity-info {
                text-align: right;
                line-height: 2;
            }
            
            .validity-line {
                border-bottom: 1px dotted #000;
                padding-bottom: 3px;
                margin-bottom: 10px;
                min-width: 200px;
                min-height: 20px;
                display: flex;
                align-items: baseline;
            }
            
            .number-line {
                border-bottom: 1px dotted #000;
                padding-bottom: 3px;
                min-width: 200px;
                min-height: 20px;
                display: flex;
                align-items: baseline;
            }
            
            @media print {
                body {
                    padding: 0;
                    margin: 0;
                }
                
                .voucher-container {
                    border: 2px solid #000;
                    box-shadow: none;
                }
            }
        </style>
    </head>
    <body>
        <div class="voucher-container">
            <div class="header">
                <div class="salon-title">Salon</div>
                <div class="hanami-spa">
                    <h1 class="hanami-text">Hanami</h1>
                    <span class="flower-icon">🌸</span>
                    <span class="spa-text">SPA</span>
                </div>
                <div class="subtitle">serdecznie zaprasza</div>
            </div>
            
            <div class="content">
                <div class="recipient-line">
                    <span class="recipient-label">Panią/Pana</span>
                    <span class="recipient-value">${voucherOwner}</span>
                </div>
                
                <div class="service-line">
                    na zabieg ${serviceInfo.toLowerCase()}
                </div>
                
                <div class="value-line">
                    <span class="value-label">o wartości</span>
                    <span class="value-amount">${voucherValue}</span>
                </div>
            </div>
            
            <div class="footer">
                <div class="contact-info">
                    Prosimy o kontakt w celu<br>
                    ustalenia daty wizyty w Salonie.<br><br>
                    tel: 605 412 692<br>
                    63-400 Ostrów Wielkopolski,<br>
                    ul. Raszkowska 80e
                </div>
                
                <div class="validity-info">
                    <div>bon ważny do</div>
                    <div class="validity-line">${expiryDate}</div>
                    <div>numer</div>
                    <div class="number-line">${voucher.code}</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `

    // For now, we'll return the HTML content and let the browser handle PDF generation
    // In production, you could integrate with a PDF service like Puppeteer Cloud or PDFShift
    
    const htmlResponse = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Bon ${voucher.code} - Hanami Spa</title>
        <script>
          // Auto-print when page loads
          window.onload = function() {
            if (window.matchMedia) {
              var mediaQueryList = window.matchMedia('print');
              mediaQueryList.addListener(function(mql) {
                if (!mql.matches) {
                  window.close();
                }
              });
            }
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
        ${htmlContent.match(/<style>[\s\S]*?<\/style>/)[0]}
    </head>
    ${htmlContent.replace(/<style>[\s\S]*?<\/style>/, '').replace('<!DOCTYPE html><html><head><meta charset="UTF-8">', '').replace('</head>', '')}
    </html>
    `

    return new Response(htmlResponse, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})