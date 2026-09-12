import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../wayfinder'
import live from './live'
import sessions from './sessions'
import captures from './captures'
/**
* @see \App\Http\Controllers\Consult\ConsultationController::store
* @see app/Http/Controllers/Consult/ConsultationController.php:64
* @route '/consult'
*/
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/consult',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::store
* @see app/Http/Controllers/Consult/ConsultationController.php:64
* @route '/consult'
*/
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::store
* @see app/Http/Controllers/Consult/ConsultationController.php:64
* @route '/consult'
*/
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::store
* @see app/Http/Controllers/Consult/ConsultationController.php:64
* @route '/consult'
*/
const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::store
* @see app/Http/Controllers/Consult/ConsultationController.php:64
* @route '/consult'
*/
storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(options),
    method: 'post',
})

store.form = storeForm

/**
* @see \App\Http\Controllers\Consult\ConsultationController::consent
* @see app/Http/Controllers/Consult/ConsultationController.php:74
* @route '/consult/{consultation}/consent'
*/
export const consent = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: consent.url(args, options),
    method: 'post',
})

consent.definition = {
    methods: ["post"],
    url: '/consult/{consultation}/consent',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::consent
* @see app/Http/Controllers/Consult/ConsultationController.php:74
* @route '/consult/{consultation}/consent'
*/
consent.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { consultation: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { consultation: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            consultation: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        consultation: typeof args.consultation === 'object'
        ? args.consultation.id
        : args.consultation,
    }

    return consent.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::consent
* @see app/Http/Controllers/Consult/ConsultationController.php:74
* @route '/consult/{consultation}/consent'
*/
consent.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: consent.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::consent
* @see app/Http/Controllers/Consult/ConsultationController.php:74
* @route '/consult/{consultation}/consent'
*/
const consentForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: consent.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::consent
* @see app/Http/Controllers/Consult/ConsultationController.php:74
* @route '/consult/{consultation}/consent'
*/
consentForm.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: consent.url(args, options),
    method: 'post',
})

consent.form = consentForm

/**
* @see \App\Http\Controllers\Consult\ConsultationController::chat
* @see app/Http/Controllers/Consult/ConsultationController.php:95
* @route '/consult/{consultation}/chat'
*/
export const chat = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: chat.url(args, options),
    method: 'post',
})

chat.definition = {
    methods: ["post"],
    url: '/consult/{consultation}/chat',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::chat
* @see app/Http/Controllers/Consult/ConsultationController.php:95
* @route '/consult/{consultation}/chat'
*/
chat.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { consultation: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { consultation: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            consultation: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        consultation: typeof args.consultation === 'object'
        ? args.consultation.id
        : args.consultation,
    }

    return chat.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::chat
* @see app/Http/Controllers/Consult/ConsultationController.php:95
* @route '/consult/{consultation}/chat'
*/
chat.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: chat.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::chat
* @see app/Http/Controllers/Consult/ConsultationController.php:95
* @route '/consult/{consultation}/chat'
*/
const chatForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: chat.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::chat
* @see app/Http/Controllers/Consult/ConsultationController.php:95
* @route '/consult/{consultation}/chat'
*/
chatForm.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: chat.url(args, options),
    method: 'post',
})

chat.form = chatForm

/**
* @see \App\Http\Controllers\Consult\ConsultationController::voice
* @see app/Http/Controllers/Consult/ConsultationController.php:141
* @route '/consult/{consultation}/voice'
*/
export const voice = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: voice.url(args, options),
    method: 'post',
})

voice.definition = {
    methods: ["post"],
    url: '/consult/{consultation}/voice',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::voice
* @see app/Http/Controllers/Consult/ConsultationController.php:141
* @route '/consult/{consultation}/voice'
*/
voice.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { consultation: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { consultation: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            consultation: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        consultation: typeof args.consultation === 'object'
        ? args.consultation.id
        : args.consultation,
    }

    return voice.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::voice
* @see app/Http/Controllers/Consult/ConsultationController.php:141
* @route '/consult/{consultation}/voice'
*/
voice.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: voice.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::voice
* @see app/Http/Controllers/Consult/ConsultationController.php:141
* @route '/consult/{consultation}/voice'
*/
const voiceForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: voice.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::voice
* @see app/Http/Controllers/Consult/ConsultationController.php:141
* @route '/consult/{consultation}/voice'
*/
voiceForm.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: voice.url(args, options),
    method: 'post',
})

voice.form = voiceForm

/**
* @see \App\Http\Controllers\Consult\ConsultationController::cough
* @see app/Http/Controllers/Consult/ConsultationController.php:223
* @route '/consult/{consultation}/cough'
*/
export const cough = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: cough.url(args, options),
    method: 'post',
})

cough.definition = {
    methods: ["post"],
    url: '/consult/{consultation}/cough',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::cough
* @see app/Http/Controllers/Consult/ConsultationController.php:223
* @route '/consult/{consultation}/cough'
*/
cough.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { consultation: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { consultation: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            consultation: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        consultation: typeof args.consultation === 'object'
        ? args.consultation.id
        : args.consultation,
    }

    return cough.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::cough
* @see app/Http/Controllers/Consult/ConsultationController.php:223
* @route '/consult/{consultation}/cough'
*/
cough.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: cough.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::cough
* @see app/Http/Controllers/Consult/ConsultationController.php:223
* @route '/consult/{consultation}/cough'
*/
const coughForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: cough.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::cough
* @see app/Http/Controllers/Consult/ConsultationController.php:223
* @route '/consult/{consultation}/cough'
*/
coughForm.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: cough.url(args, options),
    method: 'post',
})

cough.form = coughForm

/**
* @see \App\Http\Controllers\Consult\ConsultationController::anemia
* @see app/Http/Controllers/Consult/ConsultationController.php:240
* @route '/consult/{consultation}/anemia'
*/
export const anemia = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: anemia.url(args, options),
    method: 'post',
})

anemia.definition = {
    methods: ["post"],
    url: '/consult/{consultation}/anemia',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::anemia
* @see app/Http/Controllers/Consult/ConsultationController.php:240
* @route '/consult/{consultation}/anemia'
*/
anemia.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { consultation: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { consultation: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            consultation: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        consultation: typeof args.consultation === 'object'
        ? args.consultation.id
        : args.consultation,
    }

    return anemia.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::anemia
* @see app/Http/Controllers/Consult/ConsultationController.php:240
* @route '/consult/{consultation}/anemia'
*/
anemia.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: anemia.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::anemia
* @see app/Http/Controllers/Consult/ConsultationController.php:240
* @route '/consult/{consultation}/anemia'
*/
const anemiaForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: anemia.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::anemia
* @see app/Http/Controllers/Consult/ConsultationController.php:240
* @route '/consult/{consultation}/anemia'
*/
anemiaForm.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: anemia.url(args, options),
    method: 'post',
})

anemia.form = anemiaForm

const consult = {
    store: Object.assign(store, store),
    consent: Object.assign(consent, consent),
    chat: Object.assign(chat, chat),
    voice: Object.assign(voice, voice),
    live: Object.assign(live, live),
    sessions: Object.assign(sessions, sessions),
    cough: Object.assign(cough, cough),
    anemia: Object.assign(anemia, anemia),
    captures: Object.assign(captures, captures),
}

export default consult