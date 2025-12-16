import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuth } from './AuthContext';
import axios from 'axios';
import { useLanguage } from './LanguageContext';

const TutorialContext = createContext();

export const useTutorial = () => useContext(TutorialContext);

export const TutorialProvider = ({ children }) => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const driverRef = useRef(null);

    // Comprehensive tutorial steps for each page
    const getSteps = (key) => {
        const stepsMap = {
            'main': [
                {
                    element: '.sidebar',
                    popover: {
                        title: '🧭 Navigation Principale',
                        description: 'La barre latérale vous permet d\'accéder à toutes les sections de l\'application. Chaque icône représente une fonctionnalité différente.',
                        side: "right",
                        align: 'start'
                    }
                },
                {
                    element: '#sidebar-dashboard',
                    popover: {
                        title: '📊 Tableau de Bord',
                        description: 'Accédez au tableau de bord pour voir les statistiques globales, les graphiques d\'activité et une vue d\'ensemble de votre inventaire.',
                        side: "right",
                        align: 'center'
                    }
                },
                {
                    element: '#sidebar-inventory',
                    popover: {
                        title: '📦 Inventaire',
                        description: 'Gérez tous vos produits : ajoutez, modifiez, supprimez des articles et suivez les niveaux de stock en temps réel.',
                        side: "right",
                        align: 'center'
                    }
                },
                {
                    element: '#sidebar-settings',
                    popover: {
                        title: '⚙️ Paramètres',
                        description: 'Personnalisez l\'application : thème, langue, gestion des utilisateurs et des employés.',
                        side: "right",
                        align: 'center'
                    }
                }
            ],
            'dashboard': [
                {
                    element: '.dashboard-header',
                    popover: {
                        title: '📊 Tableau de Bord',
                        description: 'Bienvenue sur le tableau de bord ! C\'est votre centre de contrôle avec toutes les statistiques importantes de votre inventaire.',
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '.widget-grid',
                    popover: {
                        title: '📈 Statistiques & Widgets',
                        description: 'Cette zone contient toutes vos statistiques clés (stock total, alertes, catégories) ainsi que les graphiques et tableaux d\'activité.',
                        side: "left",
                        align: 'start'
                    }
                },
                {
                    element: '.view-toggles',
                    popover: {
                        title: '🎛️ Vues Personnalisées',
                        description: 'Changez de vue selon vos besoins : vue par défaut, admin, stock ou activité. Vous pouvez aussi personnaliser et sauvegarder votre propre configuration.',
                        side: "bottom",
                        align: 'start'
                    }
                }
            ],
            'inventory': [
                {
                    element: '.page-header',
                    popover: {
                        title: '📦 Gestion de l\'Inventaire',
                        description: 'Cette page centralise tous vos produits. Vous pouvez rechercher, filtrer, ajouter et gérer l\'ensemble de votre stock.',
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '.search-bar',
                    popover: {
                        title: '🔍 Recherche Rapide',
                        description: 'Tapez le nom d\'un produit pour le trouver instantanément. La recherche s\'effectue en temps réel.',
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '.category-tabs',
                    popover: {
                        title: '🏷️ Filtrer par Catégorie',
                        description: 'Cliquez sur une catégorie pour afficher uniquement les produits correspondants (PC, Écrans, Claviers, etc.).',
                        side: "bottom",
                        align: 'center'
                    }
                },
                {
                    element: '#tutorial-add-product-btn',
                    popover: {
                        title: '➕ Ajouter un Produit (Nouveau)',
                        description: 'Cliquez ici pour ajouter un nouveau produit à l\'inventaire. Renseignez le nom, la catégorie, la quantité et l\'emplacement.',
                        side: "left",
                        align: 'center'
                    }
                },
                {
                    element: '.products-grid',
                    popover: {
                        title: '📋 Liste des Produits',
                        description: 'Chaque carte représente un produit. Vous pouvez augmenter/diminuer le stock, modifier les détails ou supprimer un article. Les produits en alerte sont signalés en rouge.',
                        side: "top",
                        align: 'center'
                    }
                }
            ],
            'loanPC': [
                {
                    element: '.page-header',
                    popover: {
                        title: '💻 Gestion des PC de Prêt',
                        description: 'Gérez votre parc de PC destinés au prêt : suivez les disponibilités, les emprunts en cours et les retours.',
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '.stat-row',
                    popover: {
                        title: '📊 État du Parc',
                        description: 'Visualisez en un coup d\'œil le nombre de PC disponibles, prêtés, en maintenance ou hors service.',
                        side: "bottom",
                        align: 'center'
                    }
                },
                {
                    element: '.filter-tabs',
                    popover: {
                        title: '🔄 Filtres Rapides',
                        description: 'Filtrez la liste par état : tous les PC, disponibles, en prêt ou hors service.',
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '.add-btn',
                    popover: {
                        title: '➕ Ajouter un PC',
                        description: 'Ajoutez un nouveau PC au parc de prêt en renseignant son nom (ex: LAPTOP-PRET-01) et son numéro de série.',
                        side: "left",
                        align: 'center'
                    }
                },
                {
                    element: '.loan-table',
                    popover: {
                        title: '📋 Tableau des PC',
                        description: 'Consultez tous les PC avec leur statut, utilisateur actuel et dates de prêt. Chaque ligne propose des actions rapides.',
                        side: "top",
                        align: 'center'
                    }
                },
                {
                    element: '.icon-btn.loan',
                    popover: {
                        title: '📤 Prêter un PC',
                        description: 'Cliquez pour prêter ce PC à un utilisateur. Renseignez le nom, la raison du prêt et la date de retour prévue.',
                        side: "left",
                        align: 'center'
                    }
                },
                {
                    element: '.icon-btn.reserve',
                    popover: {
                        title: '📅 Réserver',
                        description: 'Créez une réservation pour un prêt futur. Le PC reste disponible jusqu\'à la date de début de réservation.',
                        side: "left",
                        align: 'center'
                    }
                },
                {
                    element: '.icon-btn.return',
                    popover: {
                        title: '↩️ Retour PC',
                        description: 'Marquez le retour d\'un PC prêté. Il redevient disponible pour un nouveau prêt.',
                        side: "left",
                        align: 'center'
                    }
                }
            ],
            'settings': [
                {
                    element: '.settings-container',
                    popover: {
                        title: '⚙️ Paramètres',
                        description: 'Personnalisez l\'application selon vos préférences. Naviguez entre les différents onglets pour accéder aux options.',
                        side: "top",
                        align: 'center'
                    }
                },
                {
                    element: '.tab-btn:nth-child(1)',
                    popover: {
                        title: '🎨 Apparence',
                        description: 'Changez le thème visuel de l\'application : clair, sombre ou néon pour un look futuriste.',
                        side: "right",
                        align: 'center'
                    }
                },
                {
                    element: '.tab-btn:nth-child(2)',
                    popover: {
                        title: '🌍 Langue',
                        description: 'Choisissez votre langue préférée : Français ou English.',
                        side: "right",
                        align: 'center'
                    }
                },
                {
                    element: '.tab-btn:nth-child(3)',
                    popover: {
                        title: '👥 Utilisateurs',
                        description: 'Gérez les comptes utilisateurs : créez des admins ou hotliners, modifiez les mots de passe et permissions.',
                        side: "right",
                        align: 'center'
                    }
                },
                {
                    element: '.tab-btn:nth-child(4)',
                    popover: {
                        title: '👔 Employés',
                        description: 'Gérez la liste des employés : ajoutez, modifiez ou supprimez des profils employés pour le suivi des équipements assignés.',
                        side: "right",
                        align: 'center'
                    }
                }
            ],
            'history': [
                {
                    element: '.page-header',
                    popover: {
                        title: '📜 Historique des Opérations',
                        description: 'Consultez l\'historique complet de toutes les actions effectuées dans l\'application : ajouts, modifications, suppressions.',
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '.filter-tabs',
                    popover: {
                        title: '🔄 Filtres par Type',
                        description: 'Filtrez les logs par type d\'action : tous, ajouts de produits, mises à jour de stock, etc.',
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '.search-bar',
                    popover: {
                        title: '🔍 Rechercher dans l\'Historique',
                        description: 'Recherchez une opération spécifique par mot-clé ou nom de produit.',
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '.timeline-container',
                    popover: {
                        title: '📅 Timeline des Actions',
                        description: 'Visualisez chronologiquement toutes les opérations avec le nom de l\'utilisateur, la date, l\'heure et les détails de chaque action.',
                        side: "top",
                        align: 'center'
                    }
                }
            ],
            'reports': [
                {
                    element: '.page-header',
                    popover: {
                        title: '📊 Rapports & Statistiques',
                        description: 'Générez des rapports détaillés sur l\'activité de votre inventaire pour une période donnée.',
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '.date-range-selector',
                    popover: {
                        title: '📅 Sélection de Période',
                        description: 'Choisissez la plage de dates pour votre rapport. Par défaut, le mois en cours est sélectionné.',
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '.stats-row',
                    popover: {
                        title: '📈 Résumé Statistique',
                        description: 'Voyez en un instant le nombre d\'entrées, sorties et opérations totales sur la période sélectionnée.',
                        side: "bottom",
                        align: 'center'
                    }
                },
                {
                    element: '.data-table',
                    popover: {
                        title: '📋 Détail des Opérations',
                        description: 'Tableau complet de toutes les opérations avec date, type, description, quantité et utilisateur.',
                        side: "top",
                        align: 'center'
                    }
                },
                {
                    element: '.export-buttons',
                    popover: {
                        title: '📥 Exporter le Rapport',
                        description: 'Téléchargez le rapport en PDF ou imprimez-le directement pour vos archives.',
                        side: "left",
                        align: 'center'
                    }
                }
            ]
        };
        return stepsMap[key] || stepsMap['main'];
    };

    const createDriver = (steps, isMain = false) => {
        const drv = driver({
            showProgress: true,
            animate: true,
            steps: steps,
            doneBtnText: 'Terminer ✓',
            nextBtnText: 'Suivant →',
            prevBtnText: '← Précédent',
            allowClose: true,
            popoverClass: 'modern-popover glow-popover',
            overlayColor: 'rgba(0, 0, 0, 0.8)',
            stagePadding: 15,
            stageRadius: 12,
            onDestroyed: () => {
                if (isMain) {
                    markAsSeen();
                }
            }
        });
        return drv;
    };

    useEffect(() => {
        // Auto-launch main tutorial for new users
        if (user && user.has_seen_tutorial === false) {
            const steps = getSteps('main');
            if (document.querySelector(steps[0].element)) {
                if (driverRef.current) {
                    driverRef.current.destroy();
                }
                const drv = createDriver(steps, true);
                driverRef.current = drv;
                setTimeout(() => drv.drive(), 1500);
            } else {
                console.log("Tutorial skipped: Start element not found");
            }
        }
    }, [user, t]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (driverRef.current) {
                driverRef.current.destroy();
            }
        };
    }, []);

    const markAsSeen = async () => {
        if (!user || user.has_seen_tutorial === true) return;
        try {
            await axios.post('/api/users/tutorial-seen');
        } catch (error) {
            console.error('Failed to mark tutorial as seen', error);
        }
    };

    const startTutorial = (key = 'main') => {
        // Destroy active driver first to avoid overlay conflicts
        if (driverRef.current) {
            driverRef.current.destroy();
        }

        const steps = getSteps(key);
        // Ensure elements exist
        if (steps.length > 0 && document.querySelector(steps[0].element)) {
            setTimeout(() => {
                const drv = createDriver(steps, false);
                driverRef.current = drv;
                drv.drive();
            }, 200);
        } else {
            console.warn(`Tutorial '${key}' cannot start: target element not found.`);
        }
    };

    return (
        <TutorialContext.Provider value={{ startTutorial }}>
            {children}

            {/* Custom styles for tutorial popover with glow effect */}
            <style>{`
                .glow-popover {
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
                    border: 1px solid rgba(59, 130, 246, 0.4) !important;
                    border-radius: 16px !important;
                    box-shadow: 0 0 40px rgba(59, 130, 246, 0.3), 0 0 80px rgba(139, 92, 246, 0.2) !important;
                    color: #e2e8f0 !important;
                    animation: popoverGlow 3s ease-in-out infinite alternate;
                    z-index: 10000000 !important;
                }
                
                .glow-popover {
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
                    border: 1px solid rgba(59, 130, 246, 0.4) !important;
                    border-radius: 16px !important;
                    box-shadow: 0 0 40px rgba(59, 130, 246, 0.3), 0 0 80px rgba(139, 92, 246, 0.2) !important;
                    color: #e2e8f0 !important;
                    animation: popoverGlow 3s ease-in-out infinite alternate;
                    z-index: 10000000 !important;
                }
                
                .glow-popover .driver-popover-title {
                    color: #f1f5f9 !important;
                    font-size: 1.1rem !important;
                    font-weight: 600 !important;
                }
                
                .glow-popover .driver-popover-description {
                    color: #94a3b8 !important;
                    font-size: 0.85rem !important;
                    line-height: 1.5 !important;
                }
                
                .glow-popover .driver-popover-progress-text {
                    color: #64748b !important;
                    font-size: 0.75rem !important;
                }
                
                .glow-popover .driver-popover-footer {
                    gap: 0.5rem !important;
                }
                
                .glow-popover .driver-popover-prev-btn,
                .glow-popover .driver-popover-next-btn,
                .glow-popover .driver-popover-done-btn {
                    padding: 0.4rem 0.8rem !important;
                    font-size: 0.8rem !important;
                    min-width: auto !important;
                }
                
                .glow-popover .driver-popover-prev-btn {
                    background: rgba(255, 255, 255, 0.1) !important;
                    border: 1px solid rgba(255, 255, 255, 0.2) !important;
                    color: #e2e8f0 !important;
                    border-radius: 6px !important;
                    transition: all 0.2s !important;
                }
                
                .glow-popover .driver-popover-prev-btn:hover {
                    background: rgba(255, 255, 255, 0.2) !important;
                }
                
                .glow-popover .driver-popover-next-btn,
                .glow-popover .driver-popover-done-btn {
                    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%) !important;
                    border: none !important;
                    color: white !important;
                    border-radius: 6px !important;
                    box-shadow: 0 2px 10px rgba(59, 130, 246, 0.3) !important;
                    transition: all 0.2s !important;
                }
                
                .glow-popover .driver-popover-next-btn:hover,
                .glow-popover .driver-popover-done-btn:hover {
                    transform: translateY(-1px) !important;
                    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4) !important;
                }
                
                .glow-popover .driver-popover-close-btn {
                    color: #94a3b8 !important;
                    width: 20px !important;
                    height: 20px !important;
                    font-size: 14px !important;
                    padding: 2px !important;
                    position: absolute !important;
                    top: 8px !important;
                    right: 8px !important;
                    z-index: 1000 !important;
                }
                
                .glow-popover .driver-popover-close-btn:hover {
                    color: #f1f5f9 !important;
                }
                
                .glow-popover .driver-popover-arrow-side-left,
                .glow-popover .driver-popover-arrow-side-right,
                .glow-popover .driver-popover-arrow-side-top,
                .glow-popover .driver-popover-arrow-side-bottom {
                    border-color: transparent !important;
                }
            `}</style>
        </TutorialContext.Provider>
    );
};
