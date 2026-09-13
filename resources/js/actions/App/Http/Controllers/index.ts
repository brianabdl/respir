import Consult from './Consult';
import Doctor from './Doctor';
import Settings from './Settings';

const Controllers = {
    Consult: Object.assign(Consult, Consult),
    Doctor: Object.assign(Doctor, Doctor),
    Settings: Object.assign(Settings, Settings),
};

export default Controllers;
