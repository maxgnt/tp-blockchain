// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VoteSimple {
    address public proprietaire;
    bool public voteOuvert;

    struct Candidat {
        string nom;
        uint256 nombreDeVotes;
    }

    Candidat[] private candidats;

    mapping(address => bool) public electeursAutorises;
    mapping(address => bool) public aDejaVote;

    event ElecteurAjoute(address indexed electeur);
    event VoteOuvert();
    event VoteEffectue(address indexed electeur, uint256 indexed idCandidat);

    modifier seulementProprietaire() {
        require(msg.sender == proprietaire, "Vous n'etes pas l'administrateur");
        _;
    }

    modifier seulementElecteur() {
        require(electeursAutorises[msg.sender], "Vous n'etes pas autorise a voter");
        _;
    }

    modifier uniquementQuandVoteOuvert() {
        require(voteOuvert, "Le vote est ferme");
        _;
    }

    constructor(string[] memory nomsCandidats) {
        require(nomsCandidats.length > 0, "Il faut au moins un candidat");

        proprietaire = msg.sender;
        voteOuvert = false;

        for (uint256 i = 0; i < nomsCandidats.length; i++) {
            candidats.push(Candidat({
                nom: nomsCandidats[i],
                nombreDeVotes: 0
            }));
        }
    }

    function ajouterElecteur(address electeur) external seulementProprietaire {
        require(electeur != address(0), "Adresse invalide");
        require(!electeursAutorises[electeur], "Electeur deja ajoute");

        electeursAutorises[electeur] = true;

        emit ElecteurAjoute(electeur);
    }

    function ouvrirLeVote() external seulementProprietaire {
        require(!voteOuvert, "Le vote est deja ouvert");

        voteOuvert = true;

        emit VoteOuvert();
    }

    function voter(uint256 idCandidat)
        external
        seulementElecteur
        uniquementQuandVoteOuvert
    {
        require(!aDejaVote[msg.sender], "Vous avez deja vote");
        require(idCandidat < candidats.length, "Candidat inexistant");

        aDejaVote[msg.sender] = true;
        candidats[idCandidat].nombreDeVotes++;

        emit VoteEffectue(msg.sender, idCandidat);
    }

    function obtenirNombreCandidats() external view returns (uint256) {
        return candidats.length;
    }

    function obtenirCandidat(uint256 idCandidat)
        external
        view
        returns (string memory, uint256)
    {
        require(idCandidat < candidats.length, "Candidat inexistant");

        Candidat memory candidat = candidats[idCandidat];
        return (candidat.nom, candidat.nombreDeVotes);
    }

    function obtenirGagnant() external view returns (string memory, uint256) {
        require(candidats.length > 0, "Aucun candidat");

        uint256 indexGagnant = 0;
        uint256 plusGrandNombreVotes = candidats[0].nombreDeVotes;

        for (uint256 i = 1; i < candidats.length; i++) {
            if (candidats[i].nombreDeVotes > plusGrandNombreVotes) {
                plusGrandNombreVotes = candidats[i].nombreDeVotes;
                indexGagnant = i;
            }
        }

        return (
            candidats[indexGagnant].nom,
            candidats[indexGagnant].nombreDeVotes
        );
    }
}