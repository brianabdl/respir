<?php

namespace App\Domain\Audit\Enums;

enum AuditAction: string
{
    case ConsultationListViewed = 'consultation.list_viewed';
    case ConsultationViewed = 'consultation.viewed';
    case CaptureDownloaded = 'capture.downloaded';
    case BriefingRequested = 'briefing.requested';
    case ConsentRecorded = 'consultation.consent_recorded';
    case LiveSessionStarted = 'consultation.live_session_started';
    case CoughAnalysed = 'cough.analysed';
    case AnemiaAnalysed = 'anemia.analysed';
    case BriefingGenerated = 'briefing.generated';
}
