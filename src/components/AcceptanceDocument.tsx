import React, { useState } from 'react';
import { CheckCircle, FileText, X, Loader } from 'lucide-react';
import { Devis, DevisTotals } from '../types';

interface AcceptanceDocumentProps {
  devis: Devis;
  totalsWithOptions?: DevisTotals & { optionsHT?: number; optionsTVA?: number };
  onAccept: (signatureData: string, signatoryName: string, acceptedTerms: boolean) => Promise<void>;
  onCancel: () => void;
  accepting: boolean;
}

export const AcceptanceDocument: React.FC<AcceptanceDocumentProps> = ({
  devis,
  totalsWithOptions,
  onAccept,
  onCancel,
  accepting
}) => {
  const [signatoryName, setSignatoryName] = useState<string>('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const displayTotals = totalsWithOptions || devis.totaux;
  const hasOptions = totalsWithOptions && (totalsWithOptions.optionsHT ?? 0) > 0;
  const canSubmit = signatoryName.trim() && acceptedTerms;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    await onAccept('', signatoryName, acceptedTerms);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8">
        <div className="sticky top-0 bg-white border-b z-10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#29235C]">Document de validation du devis</h2>
          <button
            onClick={onCancel}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
            disabled={accepting}
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Document Header */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">Document contractuel</h3>
                <p className="text-sm text-blue-800 mt-1">
                  Veuillez lire attentivement les conditions ci-dessous et signer ce document pour valider votre acceptation du devis.
                </p>
              </div>
            </div>
          </div>

          {/* Devis Summary */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-bold text-gray-900 mb-4">Récapitulatif du devis</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Projet :</span>
                <span className="font-medium text-gray-900">{devis.titre_affaire}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Client :</span>
                <span className="font-medium text-gray-900">
                  {devis.client.prenom} {devis.client.nom}
                </span>
              </div>
              {hasOptions && (
                <>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-600">Montant initial TTC :</span>
                    <span className="font-medium text-gray-900">{devis.totaux.ttc.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Options ajoutées :</span>
                    <span className="font-medium text-[#E72C63]">+ {((totalsWithOptions?.optionsHT ?? 0) * 1.2).toFixed(2)} €</span>
                  </div>
                </>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600">Montant total TTC :</span>
                <span className="text-xl font-bold text-[#29235C]">{displayTotals.ttc.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Acompte à la commande (40%) :</span>
                <span className="text-lg font-bold text-[#E72C63]">{displayTotals.acompte.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="border rounded-lg p-6 max-h-96 overflow-y-auto bg-white">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#29235C]" />
              Conditions générales de vente
            </h3>

            <div className="space-y-4 text-sm text-gray-700">
              <section>
                <h4 className="font-semibold text-gray-900 mb-2">1. Objet</h4>
                <p>
                  Les présentes conditions générales de vente régissent les relations contractuelles entre
                  Bruneau Protection et ses clients pour toute prestation de fourniture et d'installation
                  d'équipements de sécurité. Elles s’appliquent aux clients particuliers et professionnels, sous réserve des dispositions spécifiques prévues par la loi.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">2. Validité du devis</h4>
                <p>
                  Le présent devis est valable 30 jours à compter de sa date d'émission. Passé ce délai,
                  les prix et conditions pourront être révisés.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">3. Commande et acompte</h4>
                <p>
                  La commande est ferme et définitive dès validation de ce document. Un acompte de 40%
                  du montant total TTC est requis à la commande. Cet acompte sera encaissé dans un délai
                  de 7 jours suivant la validation.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">4. Modalités de paiement</h4>
                <p>
                  Le solde du montant total, soit 60% du montant TTC, est payable à la livraison et après
                  installation complète des équipements. Les modes de paiement acceptés sont : virement
                  bancaire, chèque et espèces (dans la limite légale).
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">5. Délais de livraison et d'installation</h4>
                <p>
                  Les délais de livraison et d'installation seront confirmés après acceptation du devis
                  et réception de l'acompte. Bruneau Protection s'engage à respecter au mieux les délais
                  annoncés, sous réserve de disponibilité des produits et d'accès au site d'installation.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">6. Installation</h4>
                <p>
                  L'installation sera réalisée par nos techniciens qualifiés. Le client s'engage à fournir
                  un accès libre et sécurisé au site d'installation et à être présent ou représenté lors
                  de l'intervention. Toute intervention supplémentaire nécessaire et non prévue au devis
                  fera l'objet d'un devis complémentaire.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">7. Garantie</h4>
                <p>
                  Les équipements fournis bénéficient de la garantie constructeur dont la durée varie selon
                  les produits (généralement 2 ans). L'installation est garantie 1 an contre tout vice de
                  mise en œuvre. La garantie ne couvre pas l'usure normale, les dommages causés par une
                  utilisation inappropriée ou un manque d'entretien.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">8. Droit de rétractation</h4>
                <p>
                  Conformément à la législation en vigueur, le client dispose d'un délai de 14 jours pour
                  exercer son droit de rétractation à compter de la signature du présent document. En cas de démarrage des travaux avant la fin du délai de rétractation, à la demande expresse du client, celui-ci renonce à son droit de rétractation conformément à l’article L221-25 du Code de la consommation.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">9. Responsabilité</h4>
                <p>
                  Bruneau Protection ne saurait être tenue responsable des dommages indirects ou immatériels
                  résultant de l'utilisation ou de l'impossibilité d'utiliser les équipements. La
                  responsabilité de Bruneau Protection est limitée au montant facturé pour la prestation. La présente limitation de responsabilité ne s’applique pas en cas de faute lourde, faute intentionnelle ou dommages corporels, ni aux dispositions d’ordre public applicables aux consommateurs.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">10. Protection des données</h4>
                <p>
                  Les informations recueillies font l'objet d'un traitement informatique destiné à la gestion
                  commerciale et administrative. Conformément au RGPD, vous disposez d'un droit d'accès, de
                  rectification et de suppression des données vous concernant.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">11. Litiges</h4>
                <p>
                  En cas de litige avec un client professionnel, compétence expresse est attribuée aux tribunaux du ressort du siège social de Bruneau Protection.
                  En cas de litige avec un client particulier, les règles de compétence légale s’appliquent.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">12. Retard de paiement</h4>
                <p>
                  Tout retard de paiement entraîne de plein droit l’application de pénalités calculées sur la base du taux légal en vigueur. Pour les clients professionnels, une indemnité forfaitaire de 40 € pour frais de recouvrement sera exigible.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">13. Réserve de propriété</h4>
                <p>
                  Les équipements installés demeurent la propriété de Bruneau Protection jusqu’au paiement intégral du prix.
                </p>
              </section>
            </div>
          </div>

          {/* Signatory Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom complet du signataire *
            </label>
            <input
              type="text"
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              placeholder="Prénom NOM"
              className="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29235C] focus:border-[#29235C]"
              disabled={accepting}
            />
          </div>

          {/* Acceptance Confirmation */}
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
            <input
              type="checkbox"
              id="accept-terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 w-5 h-5 text-[#29235C] rounded focus:ring-[#29235C]"
            />
            <label htmlFor="accept-terms" className="text-sm text-gray-700 cursor-pointer">
              <strong>Je confirme accepter ce devis</strong>{hasOptions && ' avec les options sélectionnées'} d'un montant total de{' '}
              <strong className="text-[#29235C]">{displayTotals.ttc.toFixed(2)} € TTC</strong>, incluant un acompte de{' '}
              <strong className="text-[#E72C63]">{displayTotals.acompte.toFixed(2)} €</strong> à la commande,
              et je m'engage à respecter les conditions générales de vente.
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <button
              onClick={onCancel}
              disabled={accepting}
              className="flex-1 px-6 py-3 min-h-[44px] border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || accepting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] bg-[#E72C63] text-white rounded-lg hover:bg-[#d12656] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {accepting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Validation en cours...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Valider et signer le devis</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
