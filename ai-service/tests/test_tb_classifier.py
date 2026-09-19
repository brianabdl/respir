from app.services.tb_classifier import TbClassifier


def test_risk_bands_follow_calibrated_cutoffs():
    assert TbClassifier._risk(0.2) == "low"
    assert TbClassifier._risk(0.54) == "low"
    assert TbClassifier._risk(0.55) == "medium"
    assert TbClassifier._risk(0.65) == "medium"
    assert TbClassifier._risk(0.66) == "high"
    assert TbClassifier._risk(0.9) == "high"
