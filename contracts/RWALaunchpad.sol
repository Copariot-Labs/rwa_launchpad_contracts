// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./mocks/MockToken.sol";

/**
 * @title RWALaunchpad
 * @dev Super lightweight DEX factory - Final deployable solution
 * 
 * Core strategy:
 * 1. Minimalist design - Only retain core deployment functionality
 * 2. External dependencies - Move complex logic to external contracts
 * 3. Step-by-step deployment - Support phased deployment
 * 4. Event-driven - Record deployment process through events
 */
contract RWALaunchpad is Ownable {
    
    // ============ State Variables ============
    
    uint256 private _projectCounter;
    uint256 public deploymentFee;
    
    // External contract builder address
    address public contractBuilder;
    
    // Project basic information
    mapping(uint256 => address) public projectOwners;
    mapping(uint256 => string) public projectNames;
    mapping(uint256 => uint8) public projectStages; // 0=Created 1=Tokens 2=Core 3=Completed
    
    // Project contract addresses
    mapping(uint256 => address) public rwaTokens;
    mapping(uint256 => address) public prRwaTokens;
    mapping(uint256 => address) public stableRwaTokens;
    mapping(uint256 => address) public bankContracts;
    mapping(uint256 => address) public marketContracts;
    mapping(uint256 => address) public stakePoolContracts;
    mapping(uint256 => address) public helperContracts;
    
    // Deployment mode: false=Quick mode (MockToken), true=Real mode (actual contracts)
    bool public useRealContracts = false;
    
    // Real contract template addresses (need to be deployed in advance)
    address public rwaTemplate;
    address public prRwaTemplate;
    address public stableRwaTemplate;
    address public bankTemplate;
    address public marketTemplate;
    address public stakePoolTemplate;
    address public helperTemplate;
    address public glaTemplate;
    
    // ============ Event Definitions ============
    
    event ProjectCreated(uint256 indexed projectId, string name, address indexed owner);
    event TokensDeployed(uint256 indexed projectId, address rwa, address prRwa, address stableRwa);
    event CoreDeployed(uint256 indexed projectId, address bank, address market, address stakePool);
    event ProjectCompleted(uint256 indexed projectId, address helper);
    event ProjectOwnershipTransferred(uint256 indexed projectId, address indexed oldOwner, address indexed newOwner);
    event ProjectPaused(uint256 indexed projectId, uint8 previousStage);
    event ProjectResumed(uint256 indexed projectId, uint8 newStage);
    event ProjectNameUpdated(uint256 indexed projectId, string oldName, string newName);
    event DeploymentFeeUpdated(uint256 newFee, string description);
    event DeploymentModeUpdated(bool useRealContracts);
    
    // ============ Constructor ============
    
    constructor() {
        _projectCounter = 0;
        deploymentFee = 0;
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev Step 1: Create project
     */
    function createProject(string memory projectName) external payable returns (uint256 projectId) {
        require(msg.value >= deploymentFee, "Insufficient fee");
        require(bytes(projectName).length > 0, "Empty name");
        
        projectId = ++_projectCounter;
        projectOwners[projectId] = msg.sender;
        projectNames[projectId] = projectName;
        projectStages[projectId] = 0; // Creation stage
        
        emit ProjectCreated(projectId, projectName, msg.sender);
    }
    
    /**
     * @dev Step 2: Deploy token contracts
     */
    function deployTokens(
        uint256 projectId,
        bytes memory rwaBytecode,
        bytes memory prRwaBytecode,
        bytes memory stableRwaBytecode
    ) external {
        require(projectOwners[projectId] == msg.sender, "Not owner");
        require(projectStages[projectId] == 0, "Wrong stage");
        
        // Generate salt
        bytes32 salt = keccak256(abi.encodePacked(projectId, msg.sender));
        
        // Deploy tokens
        rwaTokens[projectId] = Create2.deploy(0, keccak256(abi.encodePacked(salt, "rwa")), rwaBytecode);
        prRwaTokens[projectId] = Create2.deploy(0, keccak256(abi.encodePacked(salt, "prRwa")), prRwaBytecode);
        stableRwaTokens[projectId] = Create2.deploy(0, keccak256(abi.encodePacked(salt, "stableRwa")), stableRwaBytecode);
        
        projectStages[projectId] = 1; // Token stage completed
        
        emit TokensDeployed(
            projectId,
            rwaTokens[projectId],
            prRwaTokens[projectId],
            stableRwaTokens[projectId]
        );
    }
    
    /**
     * @dev Step 3: Deploy core contracts
     */
    function deployCoreContracts(
        uint256 projectId,
        bytes memory bankBytecode,
        bytes memory marketBytecode,
        bytes memory poolBytecode
    ) external {
        require(projectOwners[projectId] == msg.sender, "Not owner");
        require(projectStages[projectId] == 1, "Wrong stage");
        
        bytes32 salt = keccak256(abi.encodePacked(projectId, msg.sender));
        
        // Deploy core contracts
        bankContracts[projectId] = Create2.deploy(0, keccak256(abi.encodePacked(salt, "bank")), bankBytecode);
        marketContracts[projectId] = Create2.deploy(0, keccak256(abi.encodePacked(salt, "market")), marketBytecode);
        stakePoolContracts[projectId] = Create2.deploy(0, keccak256(abi.encodePacked(salt, "pool")), poolBytecode);
        
        projectStages[projectId] = 2; // Core stage completed
        
        emit CoreDeployed(
            projectId,
            bankContracts[projectId],
            marketContracts[projectId],
            stakePoolContracts[projectId]
        );
    }
    
    /**
     * @dev Step 4: Deploy helper contract and complete
     */
    function deployHelper(
        uint256 projectId,
        bytes memory helperBytecode
    ) external {
        require(projectOwners[projectId] == msg.sender, "Not owner");
        require(projectStages[projectId] == 2, "Wrong stage");
        
        bytes32 salt = keccak256(abi.encodePacked(projectId, msg.sender));
        
        // Deploy Helper contract
        helperContracts[projectId] = Create2.deploy(0, keccak256(abi.encodePacked(salt, "helper")), helperBytecode);
        
        projectStages[projectId] = 3; // Completed
        
        emit ProjectCompleted(projectId, helperContracts[projectId]);
    }
    
    /**
     * @dev One-click deployment (using preset configuration)
     */
    function deployWithPreset(
        string memory projectName,
        uint8 presetType // 0=Conservative 1=Balanced 2=Aggressive
    ) external payable returns (uint256 projectId) {
        require(presetType <= 2, "Invalid preset");
        require(msg.value >= deploymentFee, "Insufficient fee");
        require(bytes(projectName).length > 0, "Empty name");
        
        // Directly create project to avoid internal call issues
        projectId = ++_projectCounter;
        projectOwners[projectId] = msg.sender;  // Correctly set caller as owner
        projectNames[projectId] = projectName;
        projectStages[projectId] = 0; // Creation stage
        
        emit ProjectCreated(projectId, projectName, msg.sender);
        
        // Actually deploy token contracts
        _deployProjectTokens(projectId, projectName, presetType);
        
        // Set to completed status
        projectStages[projectId] = 3;
        
        emit ProjectCompleted(projectId, address(0));
    }
    
    /**
     * @dev Internal function: Deploy project tokens
     */
    function _deployProjectTokens(
        uint256 projectId,
        string memory projectName,
        uint8 presetType
    ) internal {
        // Use simpler direct deployment method to avoid Create2 complexity
        
        if (useRealContracts && rwaTemplate != address(0)) {
            // Real contract deployment mode - use cloning
            address rwaClone = Clones.clone(rwaTemplate);
            address marketClone = Clones.clone(marketTemplate);
            address bankClone = Clones.clone(bankTemplate);
            
            rwaTokens[projectId] = rwaClone;
            marketContracts[projectId] = marketClone;
            bankContracts[projectId] = bankClone;
        } else {
            // Quick deployment mode - use MockToken
            MockToken rwaToken = new MockToken(
                string(abi.encodePacked(projectName, " RWA")),
                "RWA",
                18
            );
            
            MockToken marketToken = new MockToken(
                string(abi.encodePacked(projectName, " Market")),
                "MARKET",
                18
            );
            
            MockToken bankToken = new MockToken(
                string(abi.encodePacked(projectName, " Bank")),
                "BANK",
                18
            );
            
            rwaTokens[projectId] = address(rwaToken);
            marketContracts[projectId] = address(marketToken);
            bankContracts[projectId] = address(bankToken);
        }
        
        emit TokensDeployed(
            projectId,
            rwaTokens[projectId],
            address(0), // prRwa not implemented yet
            address(0)  // stableRwa not implemented yet
        );
        
        emit CoreDeployed(
            projectId,
            bankContracts[projectId],
            marketContracts[projectId],
            address(0) // stakePool not implemented yet
        );
    }
    
    // ============ Query Functions ============
    
    function getProject(uint256 projectId) external view returns (
        string memory name,
        address owner,
        uint8 stage,
        address rwa,
        address market,
        address bank
    ) {
        return (
            projectNames[projectId],
            projectOwners[projectId],
            projectStages[projectId],
            rwaTokens[projectId],
            marketContracts[projectId],
            bankContracts[projectId]
        );
    }
    
    function getProjectCount() external view returns (uint256) {
        return _projectCounter;
    }
    
    function getAllContracts(uint256 projectId) external view returns (
        address rwa,
        address prRwa,
        address stableRwa,
        address bank,
        address market,
        address stakePool,
        address helper
    ) {
        return (
            rwaTokens[projectId],
            prRwaTokens[projectId],
            stableRwaTokens[projectId],
            bankContracts[projectId],
            marketContracts[projectId],
            stakePoolContracts[projectId],
            helperContracts[projectId]
        );
    }
    
    /**
     * @dev Get all project ID list
     */
    function getAllProjectIds() external view returns (uint256[] memory) {
        uint256[] memory projectIds = new uint256[](_projectCounter);
        for (uint256 i = 1; i <= _projectCounter; i++) {
            projectIds[i - 1] = i;
        }
        return projectIds;
    }
    
    /**
     * @dev Get paginated project list
     */
    function getProjectsPaginated(
        uint256 offset,
        uint256 limit
    ) external view returns (
        uint256[] memory projectIds,
        string[] memory names,
        address[] memory owners,
        uint8[] memory stages,
        uint256 totalCount
    ) {
        totalCount = _projectCounter;
        
        if (offset >= totalCount) {
            // Return empty arrays
            return (new uint256[](0), new string[](0), new address[](0), new uint8[](0), totalCount);
        }
        
        uint256 end = offset + limit;
        if (end > totalCount) {
            end = totalCount;
        }
        
        uint256 length = end - offset;
        projectIds = new uint256[](length);
        names = new string[](length);
        owners = new address[](length);
        stages = new uint8[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 projectId = offset + i + 1;
            projectIds[i] = projectId;
            names[i] = projectNames[projectId];
            owners[i] = projectOwners[projectId];
            stages[i] = projectStages[projectId];
        }
    }
    
    /**
     * @dev Get all projects of a user
     */
    function getUserProjects(address user) external view returns (uint256[] memory) {
        // First calculate user's project count
        uint256 userProjectCount = 0;
        for (uint256 i = 1; i <= _projectCounter; i++) {
            if (projectOwners[i] == user) {
                userProjectCount++;
            }
        }
        
        // Create array and fill
        uint256[] memory userProjects = new uint256[](userProjectCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= _projectCounter; i++) {
            if (projectOwners[i] == user) {
                userProjects[index] = i;
                index++;
            }
        }
        
        return userProjects;
    }
    
    /**
     * @dev Get project statistics
     */
    function getProjectStats() external view returns (
        uint256 totalProjects,
        uint256 completedProjects,
        uint256 activeProjects,
        uint256 totalFees
    ) {
        totalProjects = _projectCounter;
        
        for (uint256 i = 1; i <= _projectCounter; i++) {
            if (projectStages[i] == 3) {
                completedProjects++;
            } else if (projectStages[i] > 0) {
                activeProjects++;
            }
        }
        
        totalFees = address(this).balance;
    }
    
    /**
     * @dev Check if project exists
     */
    function projectExists(uint256 projectId) external view returns (bool) {
        return projectId > 0 && projectId <= _projectCounter;
    }
    
    // ============ Management Functions ============
    
    function setContractBuilder(address _builder) external onlyOwner {
        contractBuilder = _builder;
    }
    
    function setDeploymentFee(uint256 newFee) external onlyOwner {
        deploymentFee = newFee;
    }
    
    function withdrawFees(address payable recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees");
        recipient.transfer(balance);
    }
    
    /**
     * @dev Transfer project ownership
     */
    function transferProjectOwnership(uint256 projectId, address newOwner) external {
        require(projectOwners[projectId] == msg.sender, "Not owner");
        require(newOwner != address(0), "Invalid new owner");
        require(newOwner != msg.sender, "Same owner");
        
        address oldOwner = projectOwners[projectId];
        projectOwners[projectId] = newOwner;
        
        emit ProjectOwnershipTransferred(projectId, oldOwner, newOwner);
    }
    
    /**
     * @dev Emergency pause project (owner only)
     */
    function emergencyPauseProject(uint256 projectId) external onlyOwner {
        require(this.projectExists(projectId), "Project not exists");
        require(projectStages[projectId] != 255, "Already paused");
        
        // Save current stage to temporary variable, 255 represents paused state
        uint8 currentStage = projectStages[projectId];
        projectStages[projectId] = 255; // Pause marker
        
        emit ProjectPaused(projectId, currentStage);
    }
    
    /**
     * @dev Resume paused project (owner only)
     */
    function resumeProject(uint256 projectId, uint8 resumeStage) external onlyOwner {
        require(this.projectExists(projectId), "Project not exists");
        require(projectStages[projectId] == 255, "Not paused");
        require(resumeStage <= 3, "Invalid stage");
        
        projectStages[projectId] = resumeStage;
        
        emit ProjectResumed(projectId, resumeStage);
    }
    
    /**
     * @dev Update project name
     */
    function updateProjectName(uint256 projectId, string memory newName) external {
        require(projectOwners[projectId] == msg.sender, "Not owner");
        require(bytes(newName).length > 0, "Empty name");
        
        string memory oldName = projectNames[projectId];
        projectNames[projectId] = newName;
        
        emit ProjectNameUpdated(projectId, oldName, newName);
    }
    
    /**
     * @dev Batch set deployment fees (admin function)
     */
    function batchSetFees(uint256[] memory fees, string[] memory descriptions) external onlyOwner {
        require(fees.length == descriptions.length, "Array length mismatch");
        
        for (uint256 i = 0; i < fees.length; i++) {
            deploymentFee = fees[i];
            emit DeploymentFeeUpdated(fees[i], descriptions[i]);
        }
    }
    
    /**
     * @dev Set deployment mode and template addresses
     */
    function setDeploymentMode(
        bool _useRealContracts,
        address _rwa_template,
        address _pr_rwa_template,
        address _stable_rwa_template,
        address _bankTemplate,
        address _marketTemplate,
        address _stakePoolTemplate,
        address _helperTemplate,
        address _glaTemplate
    ) external onlyOwner {
        useRealContracts = _useRealContracts;
        rwaTemplate = _rwa_template;
        prRwaTemplate = _pr_rwa_template;
        stableRwaTemplate = _stable_rwa_template;
        bankTemplate = _bankTemplate;
        marketTemplate = _marketTemplate;
        stakePoolTemplate = _stakePoolTemplate;
        helperTemplate = _helperTemplate;
        glaTemplate = _glaTemplate;
        
        emit DeploymentModeUpdated(_useRealContracts);
    }
    
    // ============ Prediction Functions ============
    
    function predictAddresses(uint256 projectId, address creator) external view returns (
        address rwa,
        address prRwaAddr,
        address stableRwa,
        address bank,
        address market,
        address stakePool,
        address helper
    ) {
        bytes32 salt = keccak256(abi.encodePacked(projectId, creator));
        
        rwa = Create2.computeAddress(keccak256(abi.encodePacked(salt, "rwa")), keccak256(""));
        prRwaAddr = Create2.computeAddress(keccak256(abi.encodePacked(salt, "prRwa")), keccak256(""));
        stableRwa = Create2.computeAddress(keccak256(abi.encodePacked(salt, "stableRwa")), keccak256(""));
        bank = Create2.computeAddress(keccak256(abi.encodePacked(salt, "bank")), keccak256(""));
        market = Create2.computeAddress(keccak256(abi.encodePacked(salt, "market")), keccak256(""));
        stakePool = Create2.computeAddress(keccak256(abi.encodePacked(salt, "pool")), keccak256(""));
        helper = Create2.computeAddress(keccak256(abi.encodePacked(salt, "helper")), keccak256(""));
    }
    
    // ============ Receive ETH ============
    
    receive() external payable {}
} 