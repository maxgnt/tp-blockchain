// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/**
 * @title VotingSimple
 * @notice Contrat de vote décentralisé pour une association
 * @dev Illustre : structs, mappings, modifiers, events, gestion d'états
 */
contract VotingSimple {

    // --- Structures ---

    /// @notice Représente un candidat
    struct Candidate {
        string name;
        uint256 voteCount;
    }

    // --- Variables d'état ---

    /// @notice Adresse de l'administrateur (déployeur)
    address public owner;

    /// @notice Liste des candidats
    Candidate[] public candidates;

    /// @notice Mapping des électeurs autorisés
    mapping(address => bool) public isVoter;

    /// @notice Mapping des électeurs ayant déjà voté
    mapping(address => bool) public hasVoted;

    /// @notice État du vote (ouvert ou fermé)
    bool public votingOpen;

    // --- Events ---

    /// @notice Émis quand un électeur est ajouté
    event VoterAdded(address indexed voter);

    /// @notice Émis quand le vote est ouvert
    event VotingStarted();

    /// @notice Émis quand le vote est fermé
    event VotingEnded();

    /// @notice Émis quand un vote est enregistré
    event Voted(address indexed voter, uint256 indexed candidateId);

    // --- Errors ---

    /// @notice Erreur si l'appelant n'est pas l'admin
    error NotOwner();

    /// @notice Erreur si l'appelant n'est pas un électeur autorisé
    error NotVoter();

    /// @notice Erreur si le vote n'est pas ouvert
    error VotingNotOpen();

    /// @notice Erreur si l'électeur a déjà voté
    error AlreadyVoted();

    /// @notice Erreur si l'électeur est déjà enregistré
    error AlreadyRegistered();

    /// @notice Erreur si l'index du candidat est invalide
    error InvalidCandidate();

    // --- Modifiers ---

    /// @dev Restreint l'accès à l'admin
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @dev Restreint l'accès aux électeurs autorisés
    modifier onlyVoter() {
        if (!isVoter[msg.sender]) revert NotVoter();
        _;
    }

    /// @dev Vérifie que le vote est ouvert
    modifier votingIsOpen() {
        if (!votingOpen) revert VotingNotOpen();
        _;
    }

    // --- Constructor ---

    /// @notice Initialise le contrat avec une liste de candidats
    /// @param candidateNames Tableau des noms des candidats
    constructor(string[] memory candidateNames) {
        owner = msg.sender;
        votingOpen = false;

        for (uint256 i = 0; i < candidateNames.length; i++) {
            candidates.push(Candidate({
                name: candidateNames[i],
                voteCount: 0
            }));
        }
    }

    // --- Fonctions Admin ---

    /// @notice Ajoute un électeur autorisé
    /// @param voter Adresse de l'électeur à ajouter
    function addVoter(address voter) external onlyOwner {
        if (isVoter[voter]) revert AlreadyRegistered();
        isVoter[voter] = true;
        emit VoterAdded(voter);
    }

    /// @notice Ouvre le vote
    function startVoting() external onlyOwner {
        votingOpen = true;
        emit VotingStarted();
    }

    /// @notice Ferme le vote
    function endVoting() external onlyOwner {
        votingOpen = false;
        emit VotingEnded();
    }

    // --- Fonctions Électeur ---

    /// @notice Permet à un électeur de voter
    /// @param candidateId Index du candidat choisi
    function vote(uint256 candidateId) external onlyVoter votingIsOpen {
        if (hasVoted[msg.sender]) revert AlreadyVoted();
        if (candidateId >= candidates.length) revert InvalidCandidate();

        hasVoted[msg.sender] = true;
        candidates[candidateId].voteCount += 1;

        emit Voted(msg.sender, candidateId);
    }

    // --- Fonctions de lecture ---

    /// @notice Retourne le nombre de candidats
    function getCandidateCount() external view returns (uint256) {
        return candidates.length;
    }

    /// @notice Retourne les infos d'un candidat
    /// @param candidateId Index du candidat
    function getCandidate(uint256 candidateId) external view returns (string memory name, uint256 voteCount) {
        if (candidateId >= candidates.length) revert InvalidCandidate();
        Candidate storage candidate = candidates[candidateId];
        return (candidate.name, candidate.voteCount);
    }

    /// @notice Retourne l'index du gagnant
    function getWinner() external view returns (uint256 winnerId, string memory winnerName, uint256 winnerVotes) {
        uint256 maxVotes = 0;
        uint256 winningId = 0;

        for (uint256 i = 0; i < candidates.length; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winningId = i;
            }
        }

        return (winningId, candidates[winningId].name, candidates[winningId].voteCount);
    }
}