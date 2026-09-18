<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Consultation Report #{{ $consultation->id }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #000;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #000;
            padding-bottom: 15px;
        }
        .header h1 {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .header p {
            font-size: 10pt;
            color: #333;
        }
        .section {
            margin-bottom: 20px;
        }
        .section-title {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 10px;
            padding: 5px 0;
            border-bottom: 2px solid #000;
        }
        .info-row {
            display: table;
            width: 100%;
            margin-bottom: 8px;
        }
        .info-label {
            display: table-cell;
            width: 30%;
            font-weight: bold;
            padding-right: 10px;
        }
        .info-value {
            display: table-cell;
            width: 70%;
        }
        .risk-badge {
            display: inline-block;
            padding: 3px 10px;
            border: 2px solid #000;
            font-weight: bold;
            font-size: 10pt;
        }
        .risk-high {
            background-color: #fee;
            border-color: #c00;
            color: #c00;
        }
        .risk-medium {
            background-color: #ffeaa7;
            border-color: #fdcb6e;
            color: #d63031;
        }
        .risk-low {
            background-color: #dfe6e9;
            border-color: #636e72;
            color: #2d3436;
        }
        .content-box {
            background: #f9f9f9;
            border: 1px solid #ddd;
            padding: 10px;
            margin-top: 5px;
        }
        .footer {
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            text-align: center;
            font-size: 9pt;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80pt;
            color: rgba(0, 0, 0, 0.05);
            font-weight: bold;
            z-index: -1;
        }
        ul {
            margin-left: 20px;
            margin-top: 5px;
        }
        li {
            margin-bottom: 5px;
        }
        .signature-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }
        .signature-box {
            border-top: 1px solid #000;
            margin-top: 50px;
            padding-top: 5px;
            width: 200px;
        }
    </style>
</head>
<body>
    <div class="watermark">CONFIDENTIAL</div>

    <div class="header">
        <h1>TB SCREENING CONSULTATION REPORT</h1>
        <p>Respair Health System</p>
        <p>Generated on {{ now()->format('F d, Y h:i A') }}</p>
    </div>

    <!-- Patient Information -->
    <div class="section">
        <div class="section-title">PATIENT INFORMATION</div>
        <div class="info-row">
            <div class="info-label">Patient Name:</div>
            <div class="info-value">{{ $consultation->user->name }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Patient Email:</div>
            <div class="info-value">{{ $consultation->user->email }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Consultation ID:</div>
            <div class="info-value">#{{ $consultation->id }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Consultation Date:</div>
            <div class="info-value">{{ $consultation->created_at->format('F d, Y h:i A') }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Status:</div>
            <div class="info-value" style="text-transform: uppercase;">{{ $consultation->status }}</div>
        </div>
    </div>

    <!-- TB Risk Assessment -->
    @if($consultation->cough_risk)
    <div class="section">
        <div class="section-title">TB RISK ASSESSMENT</div>
        <div class="info-row">
            <div class="info-label">Risk Level:</div>
            <div class="info-value">
                <span class="risk-badge risk-{{ $consultation->cough_risk }}">
                    {{ strtoupper($consultation->cough_risk) }} RISK
                </span>
            </div>
        </div>
        @if($consultation->cough_analysis && isset($consultation->cough_analysis['risk_score']))
        <div class="info-row">
            <div class="info-label">Risk Score:</div>
            <div class="info-value">{{ number_format($consultation->cough_analysis['risk_score'] * 100, 1) }}%</div>
        </div>
        @endif
        @if($consultation->cough_analysis && isset($consultation->cough_analysis['explanation']))
        <div class="info-row">
            <div class="info-label">AI Analysis:</div>
            <div class="info-value">
                <div class="content-box">{{ $consultation->cough_analysis['explanation'] }}</div>
            </div>
        </div>
        @endif
    </div>
    @endif

    <!-- Clinical Briefing -->
    @if($consultation->report)
    <div class="section">
        <div class="section-title">CLINICAL BRIEFING</div>
        
        @if(isset($consultation->report['chief_complaint']))
        <div class="info-row">
            <div class="info-label">Chief Complaint:</div>
            <div class="info-value">{{ $consultation->report['chief_complaint'] }}</div>
        </div>
        @endif

        @if(isset($consultation->report['history_present_illness']))
        <div class="info-row">
            <div class="info-label">History:</div>
            <div class="info-value">
                <div class="content-box">{{ $consultation->report['history_present_illness'] }}</div>
            </div>
        </div>
        @endif

        @if(isset($consultation->report['medical_history']))
        <div class="info-row">
            <div class="info-label">Medical History:</div>
            <div class="info-value">{{ $consultation->report['medical_history'] }}</div>
        </div>
        @endif

        @if(isset($consultation->report['clinical_impression']))
        <div class="info-row">
            <div class="info-label">Clinical Impression:</div>
            <div class="info-value">
                <div class="content-box">{{ $consultation->report['clinical_impression'] }}</div>
            </div>
        </div>
        @endif

        @if(isset($consultation->report['recommendations']))
        <div class="info-row">
            <div class="info-label">Recommendations:</div>
            <div class="info-value">
                <ul>
                    @foreach(explode("\n", $consultation->report['recommendations']) as $recommendation)
                        @if(trim($recommendation))
                        <li>{{ trim($recommendation, '- ') }}</li>
                        @endif
                    @endforeach
                </ul>
            </div>
        </div>
        @endif
    </div>
    @endif

    <!-- Doctor's Clinical Notes -->
    @if($consultation->clinical_notes)
    <div class="section">
        <div class="section-title">DOCTOR'S CLINICAL NOTES</div>
        <div class="content-box">
            {{ $consultation->clinical_notes }}
        </div>
    </div>
    @endif

    <!-- Follow-up Actions -->
    @if($consultation->follow_up_actions && count($consultation->follow_up_actions) > 0)
    <div class="section">
        <div class="section-title">FOLLOW-UP ACTIONS REQUIRED</div>
        <ul>
            @foreach($consultation->follow_up_actions as $action)
            <li>{{ $action }}</li>
            @endforeach
        </ul>
    </div>
    @endif

    <!-- Review Information -->
    @if($consultation->is_reviewed)
    <div class="section">
        <div class="section-title">REVIEW INFORMATION</div>
        <div class="info-row">
            <div class="info-label">Reviewed By:</div>
            <div class="info-value">{{ $consultation->reviewer ? $consultation->reviewer->name : 'N/A' }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Reviewed At:</div>
            <div class="info-value">{{ $consultation->reviewed_at ? $consultation->reviewed_at->format('F d, Y h:i A') : 'N/A' }}</div>
        </div>
    </div>
    @endif

    <!-- Signature Section -->
    <div class="signature-section">
        <div class="info-row">
            <div class="info-label">Generated By:</div>
            <div class="info-value">{{ $doctor->name }}</div>
        </div>
        <div class="signature-box">
            <strong>Doctor's Signature</strong>
        </div>
    </div>

    <div class="footer">
        <p><strong>CONFIDENTIAL MEDICAL DOCUMENT</strong></p>
        <p>This report contains confidential patient information. Unauthorized disclosure is prohibited.</p>
        <p>Document ID: {{ $consultation->id }}-{{ now()->format('YmdHis') }}</p>
    </div>
</body>
</html>
