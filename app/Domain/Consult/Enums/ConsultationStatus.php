<?php

namespace App\Domain\Consult\Enums;

enum ConsultationStatus: string
{
    case Chatting = 'chatting';
    case Completed = 'completed';
}
