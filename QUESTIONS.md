# Questions Onboarding - Travel AI

Ces questions seront posées à l'utilisateur lors de l'onboarding pour personnaliser les recommandations de voyage.

## 1. Budget
**Question:** "Quel est votre budget pour ce voyage ?"
**Type:** Select
**Options:**
- "Économique (< 500€)" → value: 500
- "Modéré (500-1500€)" → value: 1500
- "Confortable (1500-3000€)" → value: 3000
- "Luxe (> 3000€)" → value: 5000

## 2. Style de Voyage
**Question:** "Quel type d'expérience recherchez-vous ?"
**Type:** Select
**Options:**
- "Aventure et Nature" → value: "adventure"
- "Culture et Histoire" → value: "cultural"
- "Détente et Plage" → value: "relaxation"
- "Urbain et Shopping" → value: "urban"
- "Gastronomie" → value: "food"

## 3. Mois Préférés
**Question:** "Quand souhaitez-vous voyager ?"
**Type:** Multi-select
**Options:**
- "Janvier", "Février", "Mars", "Avril", "Mai", "Juin"
- "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"

## 4. Durée du Vol
**Question:** "Quelle durée maximale de vol acceptez-vous ?"
**Type:** Select
**Options:**
- "Court (< 3h)" → value: 3
- "Moyen (3-6h)" → value: 6
- "Long (6-12h)" → value: 12
- "Peu importe" → value: 24

## 5. Activités Préférées
**Question:** "Quelles activités vous intéressent ?"
**Type:** Multi-select
**Options:**
- "Randonnée et Nature" → value: "hiking"
- "Musées et Monuments" → value: "museums"
- "Plage et Mer" → value: "beach"
- "Vie Nocturne" → value: "nightlife"
- "Sports et Aventure" → value: "sports"
- "Bien-être et Spa" → value: "wellness"
- "Shopping" → value: "shopping"

## 6. Préférence Géographique
**Question:** "Quelle région du monde vous attire ?"
**Type:** Select
**Options:**
- "Europe" → value: "europe"
- "Asie" → value: "asia"
- "Amériques" → value: "americas"
- "Afrique" → value: "africa"
- "Océanie" → value: "oceania"
- "Surprise-moi !" → value: "any"

## 7. Ville de Départ
**Question:** "D'où partez-vous ?"
**Type:** Autocomplete (IATA codes)
**Exemples:**
- "Paris (CDG, ORY)"
- "Lyon (LYS)"
- "Marseille (MRS)"
- "Nice (NCE)"
- "Toulouse (TLS)"

## 8. Nombre de Voyageurs
**Question:** "Combien de personnes voyagent ?"
**Type:** Number
**Min:** 1
**Max:** 10
**Default:** 1

## Format de Réponse

```json
{
  "budget": 1500,
  "style": "cultural",
  "preferredMonths": ["April", "May", "September"],
  "maxFlightHours": 6,
  "activities": ["museums", "beach", "shopping"],
  "destinationPreference": "europe",
  "originCity": "PAR",
  "travelers": 2
}
```
