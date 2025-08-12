// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./ProjectParameters.sol";

/**
 * @title ProjectRegistry
 * @dev Project registry contract responsible for managing all project information created through the factory
 * Maintains mapping relationships from project ID to contract addresses, provides query and management functions
 */
contract ProjectRegistry is Ownable {
    using Counters for Counters.Counter;
    
    // Project ID counter
    Counters.Counter private _projectIdCounter;
    
    // Project status enumeration
    enum ProjectStatus {
        CREATING,       // Creating
        ACTIVE,         // Active
        PAUSED,         // Paused
        DEPRECATED      // Deprecated
    }
    
    // Project contract address collection
    struct ProjectContracts {
        address rwa;          // Main token contract
        address prRwa;        // Staking reward token contract
        address stableRwa;    // Lending token contract
        address bank;         // Bank contract
        address market;       // Market contract
        address stakePool;    // Staking pool contract
        address helper;       // Helper contract
        address gla;          // GLA auction contract (optional)
    }
    
    // Project basic information
    struct ProjectInfo {
        uint256 id;                     // Project ID
        string name;                    // Project name
        address owner;                  // Project owner
        ProjectContracts contracts;     // Contract address collection
        ProjectStatus status;           // Project status
        uint256 createdAt;              // Creation time
        uint256 updatedAt;              // Update time
        bytes32 configHash;             // Configuration parameter hash
    }
    
    // Storage mappings
    mapping(uint256 => ProjectInfo) public projects;        // Project ID => Project info
    mapping(address => uint256[]) public ownerProjects;     // Owner => Project ID list
    mapping(string => uint256) public nameToProjectId;      // Project name => Project ID
    mapping(address => uint256) public contractToProject;   // Contract address => Project ID
    
    // Statistics data
    uint256 public totalProjects;           // Total project count
    uint256 public activeProjects;          // Active project count
    
    // ============ Extended Data Structures ============
    
    // Project statistics information
    struct ProjectStats {
        uint256 projectId;          // Project ID
        string name;                // Project name
        address owner;              // Project owner
        ProjectStatus status;       // Project status
        uint256 createdAt;          // Creation time
        uint256 updatedAt;          // Update time
        uint256 ageInDays;          // Project age (days)
        uint256 contractCount;      // Contract count
        bytes32 configHash;         // Configuration hash
    }
    
    // Advanced system statistics information
    struct AdvancedSystemStats {
        uint256 totalProjects;              // Total project count
        uint256 activeProjects;             // Active project count
        uint256 pausedProjects;             // Paused project count
        uint256 deprecatedProjects;         // Deprecated project count
        uint256 projectsCreatedToday;       // Projects created today
        uint256 projectsCreatedThisWeek;    // Projects created this week
        uint256 projectsCreatedThisMonth;   // Projects created this month
        uint256 averageProjectAge;         // Average project age (days)
    }
    
    // Event definitions
    event ProjectRegistered(
        uint256 indexed projectId,
        string indexed name,
        address indexed owner,
        ProjectContracts contracts
    );
    
    event ProjectStatusChanged(
        uint256 indexed projectId,
        ProjectStatus oldStatus,
        ProjectStatus newStatus
    );
    
    event ProjectOwnershipTransferred(
        uint256 indexed projectId,
        address indexed oldOwner,
        address indexed newOwner
    );
    
    // Modifiers
    modifier projectExists(uint256 projectId) {
        require(projects[projectId].id != 0, "ProjectRegistry: project does not exist");
        _;
    }
    
    modifier onlyProjectOwner(uint256 projectId) {
        require(projects[projectId].owner == msg.sender, "ProjectRegistry: not project owner");
        _;
    }
    
    modifier onlyFactoryOrOwner() {
        require(owner() == msg.sender, "ProjectRegistry: not factory or owner");
        _;
    }
    
    /**
     * @dev Register new project
     * @param name Project name
     * @param projectOwner Project owner
     * @param contracts Contract address collection
     * @param configHash Configuration parameter hash
     * @return projectId Newly created project ID  
     */
    function registerProject(
        string memory name,
        address projectOwner,
        ProjectContracts memory contracts,
        bytes32 configHash
    ) external onlyFactoryOrOwner returns (uint256 projectId) {
        require(bytes(name).length > 0, "ProjectRegistry: empty project name");
        require(projectOwner != address(0), "ProjectRegistry: zero project owner");
        require(nameToProjectId[name] == 0, "ProjectRegistry: project name already exists");
        
        // Validate contract addresses are non-zero
        require(contracts.rwa != address(0), "ProjectRegistry: zero rwa address");
        require(contracts.prRwa != address(0), "ProjectRegistry: zero prRwa address");
        require(contracts.stableRwa != address(0), "ProjectRegistry: zero stableRwa address");
        require(contracts.bank != address(0), "ProjectRegistry: zero bank address");
        require(contracts.market != address(0), "ProjectRegistry: zero market address");
        require(contracts.stakePool != address(0), "ProjectRegistry: zero stakePool address");
        require(contracts.helper != address(0), "ProjectRegistry: zero helper address");
        
        // Generate new project ID
        _projectIdCounter.increment();
        projectId = _projectIdCounter.current();
        
        // Create project information
        ProjectInfo storage project = projects[projectId];
        project.id = projectId;
        project.name = name;
        project.owner = projectOwner;
        project.contracts = contracts;
        project.status = ProjectStatus.CREATING;
        project.createdAt = block.timestamp;
        project.updatedAt = block.timestamp;
        project.configHash = configHash;
        
        // Update mapping relationships
        ownerProjects[projectOwner].push(projectId);
        nameToProjectId[name] = projectId;
        
        // Establish contract address to project ID mapping
        contractToProject[contracts.rwa] = projectId;
        contractToProject[contracts.prRwa] = projectId;
        contractToProject[contracts.stableRwa] = projectId;
        contractToProject[contracts.bank] = projectId;
        contractToProject[contracts.market] = projectId;
        contractToProject[contracts.stakePool] = projectId;
        contractToProject[contracts.helper] = projectId;
        if (contracts.gla != address(0)) {
            contractToProject[contracts.gla] = projectId;
        }
        
        // Update statistics
        totalProjects++;
        
        emit ProjectRegistered(projectId, name, projectOwner, contracts);
    }
    
    /**
     * @dev Activate project (complete creation)
     * @param projectId Project ID
     */
    function activateProject(uint256 projectId) 
        external 
        onlyFactoryOrOwner 
        projectExists(projectId) 
    {
        ProjectInfo storage project = projects[projectId];
        require(project.status == ProjectStatus.CREATING, "ProjectRegistry: project not in creating status");
        
        ProjectStatus oldStatus = project.status;
        project.status = ProjectStatus.ACTIVE;
        project.updatedAt = block.timestamp;
        
        activeProjects++;
        
        emit ProjectStatusChanged(projectId, oldStatus, ProjectStatus.ACTIVE);
    }
    
    /**
     * @dev Change project status
     * @param projectId Project ID
     * @param newStatus New status
     */
    function changeProjectStatus(uint256 projectId, ProjectStatus newStatus)
        external
        onlyProjectOwner(projectId)
        projectExists(projectId)
    {
        ProjectInfo storage project = projects[projectId];
        ProjectStatus oldStatus = project.status;
        
        require(oldStatus != newStatus, "ProjectRegistry: same status");
        require(oldStatus != ProjectStatus.CREATING, "ProjectRegistry: cannot change creating status");
        
        project.status = newStatus;
        project.updatedAt = block.timestamp;
        
        // Update active project count
        if (oldStatus == ProjectStatus.ACTIVE && newStatus != ProjectStatus.ACTIVE) {
            activeProjects--;
        } else if (oldStatus != ProjectStatus.ACTIVE && newStatus == ProjectStatus.ACTIVE) {
            activeProjects++;
        }
        
        emit ProjectStatusChanged(projectId, oldStatus, newStatus);
    }
    
    /**
     * @dev Transfer project ownership
     * @param projectId Project ID
     * @param newOwner New owner address
     */
    function transferProjectOwnership(uint256 projectId, address newOwner)
        external
        onlyProjectOwner(projectId)
        projectExists(projectId)
    {
        require(newOwner != address(0), "ProjectRegistry: zero new owner");
        
        ProjectInfo storage project = projects[projectId];
        address oldOwner = project.owner;
        
        require(oldOwner != newOwner, "ProjectRegistry: same owner");
        
        // Update owner
        project.owner = newOwner;
        project.updatedAt = block.timestamp;
        
        // Update owner project list
        _removeProjectFromOwner(oldOwner, projectId);
        ownerProjects[newOwner].push(projectId);
        
        emit ProjectOwnershipTransferred(projectId, oldOwner, newOwner);
    }
    
    /**
     * @dev Get project information
     * @param projectId Project ID
     * @return Project information
     */
    function getProject(uint256 projectId) 
        external 
        view 
        projectExists(projectId) 
        returns (ProjectInfo memory) 
    {
        return projects[projectId];
    }
    
    /**
     * @dev Get project ID by project name
     * @param name Project name
     * @return projectId Project ID (returns 0 if not exists)
     */
    function getProjectIdByName(string memory name) external view returns (uint256) {
        return nameToProjectId[name];
    }
    
    /**
     * @dev Get project ID by contract address
     * @param contractAddr Contract address
     * @return projectId Project ID (returns 0 if not exists)
     */
    function getProjectIdByContract(address contractAddr) external view returns (uint256) {
        return contractToProject[contractAddr];
    }
    
    /**
     * @dev Get all projects of an owner
     * @param owner Owner address
     * @return projectIds Project ID array
     */
    function getOwnerProjects(address owner) external view returns (uint256[] memory) {
        return ownerProjects[owner];
    }
    
    /**
     * @dev Get project count of an owner
     * @param owner Owner address
     * @return count Project count
     */
    function getOwnerProjectCount(address owner) external view returns (uint256) {
        return ownerProjects[owner].length;
    }
    
    /**
     * @dev Batch get project information
     * @param projectIds Project ID array
     * @return Project information array
     */
    function getProjects(uint256[] memory projectIds) 
        external 
        view 
        returns (ProjectInfo[] memory) 
    {
        ProjectInfo[] memory result = new ProjectInfo[](projectIds.length);
        for (uint256 i = 0; i < projectIds.length; i++) {
            if (projects[projectIds[i]].id != 0) {
                result[i] = projects[projectIds[i]];
            }
        }
        return result;
    }
    
    /**
     * @dev Get project count by specified status
     * @param status Project status
     * @return count Project count
     */
    function getProjectCountByStatus(ProjectStatus status) external view returns (uint256 count) {
        return _getProjectCountByStatus(status);
    }
    
    /**
     * @dev Get project count by specified status (internal function)
     * @param status Project status
     * @return count Project count
     */
    function _getProjectCountByStatus(ProjectStatus status) private view returns (uint256 count) {
        for (uint256 i = 1; i <= _projectIdCounter.current(); i++) {
            if (projects[i].id != 0 && projects[i].status == status) {
                count++;
            }
        }
    }
    
    /**
     * @dev Check if project exists
     * @param projectId Project ID
     * @return Whether exists
     */
    function isProjectExists(uint256 projectId) external view returns (bool) {
        return projects[projectId].id != 0;
    }
    
    /**
     * @dev Check if project name is available
     * @param name Project name
     * @return Whether available
     */
    function isProjectNameAvailable(string memory name) external view returns (bool) {
        return nameToProjectId[name] == 0;
    }
    
    /**
     * @dev Get current project ID counter value
     * @return Current counter value
     */
    function getCurrentProjectId() external view returns (uint256) {
        return _projectIdCounter.current();
    }
    
    /**
     * @dev Get system statistics
     * @return total Total project count
     * @return active Active project count
     * @return paused Paused project count
     * @return deprecated Deprecated project count
     */
    function getSystemStats() external view returns (
        uint256 total,
        uint256 active,
        uint256 paused,
        uint256 deprecated
    ) {
        total = totalProjects;
        active = activeProjects;
        
        for (uint256 i = 1; i <= _projectIdCounter.current(); i++) {
            if (projects[i].status == ProjectStatus.PAUSED) {
                paused++;
            } else if (projects[i].status == ProjectStatus.DEPRECATED) {
                deprecated++;
            }
        }
    }
    
    /**
     * @dev Remove project from owner list
     * @param owner Owner address
     * @param projectId Project ID
     */
    function _removeProjectFromOwner(address owner, uint256 projectId) private {
        uint256[] storage ownerProjectList = ownerProjects[owner];
        for (uint256 i = 0; i < ownerProjectList.length; i++) {
            if (ownerProjectList[i] == projectId) {
                ownerProjectList[i] = ownerProjectList[ownerProjectList.length - 1];
                ownerProjectList.pop();
                break;
            }
        }
    }
    
    // ============ New Query Interfaces ============
    
    /**
     * @dev Get all project IDs
     * @return projectIds All project ID array
     */
    function getAllProjectIds() external view returns (uint256[] memory projectIds) {
        uint256 currentId = _projectIdCounter.current();
        projectIds = new uint256[](totalProjects);
        
        uint256 index = 0;
        for (uint256 i = 1; i <= currentId; i++) {
            if (projects[i].id != 0) {
                projectIds[index] = i;
                index++;
            }
        }
    }
    
    /**
     * @dev Get paginated project list
     * @param offset Offset (starts from 0)
     * @param limit Limit count (max 100)
     * @return projectInfos Project information array
     * @return total Total project count
     * @return hasMore Whether there are more
     */
    function getProjectsPaginated(uint256 offset, uint256 limit) 
        external 
        view 
        returns (
            ProjectInfo[] memory projectInfos,
            uint256 total,
            bool hasMore
        ) 
    {
        require(limit > 0 && limit <= 100, "ProjectRegistry: invalid limit");
        
        total = totalProjects;
        
        if (offset >= total) {
            return (new ProjectInfo[](0), total, false);
        }
        
        uint256 remaining = total - offset;
        uint256 returnSize = remaining > limit ? limit : remaining;
        projectInfos = new ProjectInfo[](returnSize);
        
        uint256 currentId = _projectIdCounter.current();
        uint256 found = 0;
        uint256 skipped = 0;
        
        for (uint256 i = 1; i <= currentId && found < returnSize; i++) {
            if (projects[i].id != 0) {
                if (skipped >= offset) {
                    projectInfos[found] = projects[i];
                    found++;
                } else {
                    skipped++;
                }
            }
        }
        
        hasMore = offset + returnSize < total;
    }
    
    /**
     * @dev Get project ID list by status
     * @param status Project status
     * @return projectIds Project ID array matching criteria
     */
    function getProjectIdsByStatus(ProjectStatus status) 
        external 
        view 
        returns (uint256[] memory projectIds) 
    {
        // First calculate count
        uint256 count = 0;
        uint256 currentId = _projectIdCounter.current();
        
        for (uint256 i = 1; i <= currentId; i++) {
            if (projects[i].id != 0 && projects[i].status == status) {
                count++;
            }
        }
        
        // Allocate array and fill
        projectIds = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= currentId; i++) {
            if (projects[i].id != 0 && projects[i].status == status) {
                projectIds[index] = i;
                index++;
            }
        }
    }
    
    /**
     * @dev Get paginated project list by status
     * @param status Project status
     * @param offset Offset
     * @param limit Limit count (max 100)
     * @return projectInfos Project information array
     * @return total Total project count for this status
     * @return hasMore Whether there are more
     */
    function getProjectsByStatusPaginated(
        ProjectStatus status,
        uint256 offset,
        uint256 limit
    ) external view returns (
        ProjectInfo[] memory projectInfos,
        uint256 total,
        bool hasMore
    ) {
        require(limit > 0 && limit <= 100, "ProjectRegistry: invalid limit");
        
        // Calculate total project count for this status
        total = _getProjectCountByStatus(status);
        
        if (offset >= total) {
            return (new ProjectInfo[](0), total, false);
        }
        
        uint256 remaining = total - offset;
        uint256 returnSize = remaining > limit ? limit : remaining;
        projectInfos = new ProjectInfo[](returnSize);
        
        uint256 currentId = _projectIdCounter.current();
        uint256 found = 0;
        uint256 skipped = 0;
        
        for (uint256 i = 1; i <= currentId && found < returnSize; i++) {
            if (projects[i].id != 0 && projects[i].status == status) {
                if (skipped >= offset) {
                    projectInfos[found] = projects[i];
                    found++;
                } else {
                    skipped++;
                }
            }
        }
        
        hasMore = offset + returnSize < total;
    }
    
    /**
     * @dev Query projects by time range
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @return projectInfos Project array created within time range
     */
    function getProjectsByTimeRange(uint256 startTime, uint256 endTime) 
        external 
        view 
        returns (ProjectInfo[] memory projectInfos) 
    {
        require(startTime <= endTime, "ProjectRegistry: invalid time range");
        
        // First calculate count
        uint256 count = 0;
        uint256 currentId = _projectIdCounter.current();
        
        for (uint256 i = 1; i <= currentId; i++) {
            if (projects[i].id != 0 && 
                projects[i].createdAt >= startTime && 
                projects[i].createdAt <= endTime) {
                count++;
            }
        }
        
        // Allocate array and fill
        projectInfos = new ProjectInfo[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= currentId; i++) {
            if (projects[i].id != 0 && 
                projects[i].createdAt >= startTime && 
                projects[i].createdAt <= endTime) {
                projectInfos[index] = projects[i];
                index++;
            }
        }
    }
    
    /**
     * @dev Search project names (fuzzy matching)
     * @param keyword Search keyword
     * @return projectInfos Matching project array
     */
    function searchProjectsByName(string memory keyword) 
        external 
        view 
        returns (ProjectInfo[] memory projectInfos) 
    {
        bytes memory keywordBytes = bytes(keyword);
        require(keywordBytes.length > 0, "ProjectRegistry: empty keyword");
        
        // First calculate count
        uint256 count = 0;
        uint256 currentId = _projectIdCounter.current();
        
        for (uint256 i = 1; i <= currentId; i++) {
            if (projects[i].id != 0 && _contains(projects[i].name, keyword)) {
                count++;
            }
        }
        
        // Allocate array and fill
        projectInfos = new ProjectInfo[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= currentId; i++) {
            if (projects[i].id != 0 && _contains(projects[i].name, keyword)) {
                projectInfos[index] = projects[i];
                index++;
            }
        }
    }
    
    /**
     * @dev Get detailed project statistics
     * @param projectId Project ID
     * @return stats Project statistics information
     */
    function getProjectStats(uint256 projectId) 
        external 
        view 
        projectExists(projectId) 
        returns (ProjectStats memory stats) 
    {
        ProjectInfo storage project = projects[projectId];
        
        stats.projectId = projectId;
        stats.name = project.name;
        stats.owner = project.owner;
        stats.status = project.status;
        stats.createdAt = project.createdAt;
        stats.updatedAt = project.updatedAt;
        stats.ageInDays = (block.timestamp - project.createdAt) / 1 days;
        stats.contractCount = _countNonZeroContracts(project.contracts);
        stats.configHash = project.configHash;
    }
    
    /**
     * @dev Get statistics for multiple projects
     * @param projectIds Project ID array
     * @return stats Project statistics array
     */
    function getMultipleProjectStats(uint256[] memory projectIds) 
        external 
        view 
        returns (ProjectStats[] memory stats) 
    {
        stats = new ProjectStats[](projectIds.length);
        
        for (uint256 i = 0; i < projectIds.length; i++) {
            if (projects[projectIds[i]].id != 0) {
                ProjectInfo storage project = projects[projectIds[i]];
                
                stats[i].projectId = projectIds[i];
                stats[i].name = project.name;
                stats[i].owner = project.owner;
                stats[i].status = project.status;
                stats[i].createdAt = project.createdAt;
                stats[i].updatedAt = project.updatedAt;
                stats[i].ageInDays = (block.timestamp - project.createdAt) / 1 days;
                stats[i].contractCount = _countNonZeroContracts(project.contracts);
                stats[i].configHash = project.configHash;
            }
        }
    }
    
    /**
     * @dev Get advanced system statistics
     * @return stats Advanced statistics information
     */
    function getAdvancedSystemStats() 
        external 
        view 
        returns (AdvancedSystemStats memory stats) 
    {
        uint256 currentId = _projectIdCounter.current();
        
        // Basic statistics
        stats.totalProjects = totalProjects;
        stats.activeProjects = activeProjects;
        
        // Statistics by status
        for (uint256 i = 1; i <= currentId; i++) {
            if (projects[i].id != 0) {
                if (projects[i].status == ProjectStatus.PAUSED) {
                    stats.pausedProjects++;
                } else if (projects[i].status == ProjectStatus.DEPRECATED) {
                    stats.deprecatedProjects++;
                }
            }
        }
        
        // Time statistics
        uint256 currentTime = block.timestamp;
        uint256 today = currentTime - (currentTime % 1 days);
        uint256 thisWeek = currentTime - (currentTime % 1 weeks);
        uint256 thisMonth = currentTime - 30 days;
        
        for (uint256 i = 1; i <= currentId; i++) {
            if (projects[i].id != 0) {
                if (projects[i].createdAt >= today) {
                    stats.projectsCreatedToday++;
                }
                if (projects[i].createdAt >= thisWeek) {
                    stats.projectsCreatedThisWeek++;
                }
                if (projects[i].createdAt >= thisMonth) {
                    stats.projectsCreatedThisMonth++;
                }
            }
        }
        
        stats.averageProjectAge = totalProjects > 0 ? 
            _calculateAverageAge(currentId) : 0;
    }
    
    /**
     * @dev Get recently created projects
     * @param count Count limit (max 50)
     * @return projectInfos Recently created project array
     */
    function getRecentProjects(uint256 count) 
        external 
        view 
        returns (ProjectInfo[] memory projectInfos) 
    {
        require(count > 0 && count <= 50, "ProjectRegistry: invalid count");
        
        uint256 currentId = _projectIdCounter.current();
        uint256 actualCount = count > totalProjects ? totalProjects : count;
        projectInfos = new ProjectInfo[](actualCount);
        
        uint256 index = 0;
        // Start from the latest project
        for (uint256 i = currentId; i >= 1 && index < actualCount; i--) {
            if (projects[i].id != 0) {
                projectInfos[index] = projects[i];
                index++;
            }
        }
    }
    
    // ============ Private Helper Functions ============
    
    /**
     * @dev Check if string contains keyword (simple implementation)
     */
    function _contains(string memory source, string memory keyword) 
        private 
        pure 
        returns (bool) 
    {
        bytes memory sourceBytes = bytes(source);
        bytes memory keywordBytes = bytes(keyword);
        
        if (keywordBytes.length > sourceBytes.length) {
            return false;
        }
        
        // Convert to lowercase and compare (simplified implementation)
        for (uint256 i = 0; i <= sourceBytes.length - keywordBytes.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < keywordBytes.length; j++) {
                // Simple case-insensitive comparison
                bytes1 sourceByte = sourceBytes[i + j];
                bytes1 keywordByte = keywordBytes[j];
                
                // If it's uppercase letter, convert to lowercase
                if (sourceByte >= 0x41 && sourceByte <= 0x5A) {
                    sourceByte = bytes1(uint8(sourceByte) + 32);
                }
                if (keywordByte >= 0x41 && keywordByte <= 0x5A) {
                    keywordByte = bytes1(uint8(keywordByte) + 32);
                }
                
                if (sourceByte != keywordByte) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Count non-zero contract addresses
     */
    function _countNonZeroContracts(ProjectContracts memory contracts) 
        private 
        pure 
        returns (uint256 count) 
    {
        if (contracts.rwa != address(0)) count++;
        if (contracts.prRwa != address(0)) count++;
        if (contracts.stableRwa != address(0)) count++;
        if (contracts.bank != address(0)) count++;
        if (contracts.market != address(0)) count++;
        if (contracts.stakePool != address(0)) count++;
        if (contracts.helper != address(0)) count++;
        if (contracts.gla != address(0)) count++;
    }
    
    /**
     * @dev Calculate average project age
     */
    function _calculateAverageAge(uint256 currentId) private view returns (uint256) {
        uint256 totalAge = 0;
        uint256 validProjects = 0;
        
        for (uint256 i = 1; i <= currentId; i++) {
            if (projects[i].id != 0) {
                totalAge += (block.timestamp - projects[i].createdAt);
                validProjects++;
            }
        }
        
        return validProjects > 0 ? (totalAge / validProjects) / 1 days : 0;
    }
} 