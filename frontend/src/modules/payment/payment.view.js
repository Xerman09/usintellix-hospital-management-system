export function PaymentView() {
    let patientName = "Unknown Patient";
    const nameEl = document.getElementById("patientContextName");
    if (nameEl && nameEl.textContent.trim() && nameEl.textContent.trim() !== String.fromCharCode(160)) {
        patientName = nameEl.textContent.trim();
    }
    
    return `
    <div class="payment-container" style="padding: 20px; font-family: 'Inter', sans-serif;">
        <div style="background: #4472c4; color: white; padding: 10px; font-weight: 500; font-size: 16px;">
            Accept Payment - ${patientName}
        </div>
        
        <div style="background: #e9ecef; padding: 5px 10px; font-weight: 600; font-size: 18px; margin-top: 10px;">
            Payment
        </div>
        
        <div style="padding: 10px; font-size: 14px;">
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">Payment Method:</label>
                <select id="paymentMethod" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 3px;">
                    <option>Check Payment</option>
                    <option>Cash</option>
                    <option>Credit Card</option>
                </select>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Check or Reference Number:</label>
                <input id="paymentRef" type="text" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 3px;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Patient Coverage:</label>
                <label style="margin-right: 10px;"><input type="radio" name="coverage" value="self"> Self</label>
                <label><input type="radio" name="coverage" value="insurance" checked> Insurance</label>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Payment against:</label>
                <label style="margin-right: 10px;"><input type="radio" name="against" value="copay" checked> Co Pay</label>
                <label style="margin-right: 10px;"><input type="radio" name="against" value="invoice"> Invoice Balance</label>
                <label><input type="radio" name="against" value="prepay"> Pre Pay</label>
            </div>
        </div>
        
        <div style="background: #e9ecef; padding: 5px 10px; font-weight: 600; font-size: 18px; margin-top: 10px;">
            Collect For
        </div>
        
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: center;">
                <thead>
                    <tr style="background: #6a8cbd; color: black;">
                        <th style="padding: 10px;">DOS</th>
                        <th style="padding: 10px;">Encounter</th>
                        <th style="padding: 10px;">Total Charge</th>
                        <th style="padding: 10px;">Insurance<br>Payment</th>
                        <th style="padding: 10px;">Patient<br>Payment</th>
                        <th style="padding: 10px;">Co Pay Paid</th>
                        <th style="padding: 10px;">Required Co<br>Pay</th>
                        <th style="padding: 10px;">Insurance<br>Balance</th>
                        <th style="padding: 10px;">Patient<br>Balance</th>
                        <th style="padding: 10px;">Paying</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px;">2026-08-27</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td style="padding: 10px;"><input type="text" style="width: 60px; padding: 3px; border: 1px solid #ccc; border-radius: 3px;"></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px;">2014-02-01</td>
                        <td>5</td>
                        <td>175.00</td>
                        <td></td>
                        <td></td>
                        <td>-25.00</td>
                        <td>0.00</td>
                        <td>175.00</td>
                        <td></td>
                        <td style="padding: 10px;"><input type="text" style="width: 60px; padding: 3px; border: 1px solid #ccc; border-radius: 3px;"></td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div style="background: #d9d9d9; padding: 10px; text-align: right; margin-top: 20px;">
            <span style="font-weight: bold; margin-right: 10px; font-size: 14px;">Total</span>
            <input type="text" value="0.00" readonly style="width: 60px; padding: 5px; border: 1px solid #ccc; background: #e6f9e6; color: #2e7d32; border-radius: 3px; text-align: center;">
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <button id="generateInvoiceBtn" style="background: #3b5998; color: white; border: none; padding: 8px 15px; border-radius: 3px; font-size: 14px; cursor: pointer; margin-right: 10px;">
                <svg style="width: 14px; height: 14px; vertical-align: middle; margin-right: 5px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Generate Invoice
            </button>
            <button style="background: #4a76c8; color: white; border: none; padding: 8px 15px; border-radius: 3px; font-size: 14px; cursor: pointer;">
                <svg style="width: 14px; height: 14px; vertical-align: middle; margin-right: 5px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Cancel
            </button>
        </div>
    </div>
    `;
}
