import OnboardingController from './OnboardingController'
import Consult from './Consult'
import Doctor from './Doctor'
import DashboardController from './DashboardController'
import Settings from './Settings'

const Controllers = {
    OnboardingController: Object.assign(OnboardingController, OnboardingController),
    Consult: Object.assign(Consult, Consult),
    Doctor: Object.assign(Doctor, Doctor),
    DashboardController: Object.assign(DashboardController, DashboardController),
    Settings: Object.assign(Settings, Settings),
}

export default Controllers