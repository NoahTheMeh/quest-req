import React, { useState, useEffect, useRef } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import * as d3 from 'd3';

const QuestGraph = ({ WikiSync, showLabels }) => {
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [hoverNode, setHoverNode] = useState(null);
    const [highlightNodes, setHighlightNodes] = useState(new Set());
    const [highlightLinks, setHighlightLinks] = useState(new Set());
    const [questRequirements, setQuestRequirements] = useState({});
    const [selectedNodeData, setSelectedNodeData] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedLinks, setSelectedLinks] = useState(new Set());

    const fgRef = useRef();

    useEffect(() => {
        fetchQuestRequirements();
    }, [WikiSync]);

    useEffect(() => {
        if (fgRef.current && graphData.nodes.length > 0) {
            applyForceGraphConfiguration();
        }
    }, [graphData]);


    const fetchQuestRequirements = async () => {
        try {
            const response = await fetch('QuestRequirements.json');
            const data = await response.json();
            setQuestRequirements(data);
            processQuestData(data);
        } catch (error) {
            console.log(error);
        }
    };

    const processQuestData = (data) => {
        const nodes = [];
        const links = [];
        const linkCounts = new Map();
        let qp = 0;
        const isWikiSyncEmpty = !WikiSync || Object.keys(WikiSync).length === 0;
        if (!isWikiSyncEmpty) {
            console.log(WikiSync)
            const levels = WikiSync.levels

            const Melee = 1 / 4 * (levels.Defence + levels.Hitpoints + levels.Prayer * 1 / 2) + 13 / 40 * (levels.Attack + levels.Strength)
            const Ranged = 1 / 4 * (levels.Defence + levels.Hitpoints + levels.Prayer * 1 / 2) + 13 / 40 * (levels.Ranged * 3 / 2)
            const Magic = 1 / 4 * (levels.Defence + levels.Hitpoints + levels.Prayer * 1 / 2) + 13 / 40 * (levels.Magic * 3 / 2)

            WikiSync.levels['Combat level'] = Math.max(Melee, Ranged, Magic)
        }


        Object.keys(data).forEach((questName) => {
            const { questStatus, missingSkills, missingQuests, inprogressQuests, completedQuests } = getQuestStatus(
                questName,
                data,
                isWikiSyncEmpty
            );

            if (questStatus === 2) {
                qp += data[questName].QuestPoints;
            }

            const isIndependentQuest = isQuestIndependent(questName, data);

            nodes.push({
                id: questName,
                questStatus,
                missingSkills,
                missingQuests,
                inprogressQuests,
                completedQuests,
                isIndependent: isIndependentQuest,
            });

            linkCounts.set(questName, 0);
            data[questName].Quests.forEach((dependentQuest) => {
                links.push({ source: dependentQuest, target: questName });
                linkCounts.set(dependentQuest, (linkCounts.get(dependentQuest) || 0) + 1);
                linkCounts.set(questName, linkCounts.get(questName) + 1);
            });
        });

        if (Object.keys(WikiSync).length > 0) {
            WikiSync.levels['Quest points'] = qp;
        }

        const updatedNodes = nodes.map((node) => ({
            ...node,
            linkCount: linkCounts.get(node.id),
        }));

        setGraphData({ nodes: updatedNodes, links });
    };

    const getQuestStatus = (questName, data, isWikiSyncEmpty) => {
        let questStatus = 0;
        const missingSkills = [];
        const missingQuests = [];
        const inprogressQuests = [];
        const completedQuests = [];

        if (isWikiSyncEmpty) {
            questStatus = 0;
            data[questName].Quests.forEach((dependentQuest) => {
                missingQuests.push(dependentQuest);
            });
        } else {
            questStatus = WikiSync.quests[questName] || 0;

            Object.keys(data[questName].Skills || {}).forEach((skillReq) => {
                if (skillReq && WikiSync.levels[skillReq] < data[questName].Skills[skillReq]) {
                    missingSkills.push(`${skillReq}: ${data[questName].Skills[skillReq]}`);
                }
            });

            data[questName].Quests.forEach((dependentQuest) => {
                const status = WikiSync.quests[dependentQuest];
                if (status === 0) missingQuests.push(dependentQuest);
                else if (status === 1) inprogressQuests.push(dependentQuest);
                else if (status === 2) completedQuests.push(dependentQuest);
            });
        }

        return { questStatus, missingSkills, missingQuests, inprogressQuests, completedQuests };
    };

    const isQuestIndependent = (questName, data) => {
        const hasNoPrerequisites = !(data[questName].Quests && data[questName].Quests.length > 0);
        const isNotAPrerequisite = Object.keys(data).every(
            (otherQuestName) => !data[otherQuestName].Quests.includes(questName)
        );
        return hasNoPrerequisites && isNotAPrerequisite;
    };

    const applyForceGraphConfiguration = () => {
        fgRef.current.d3Force('collision', d3.forceCollide(1));
        fgRef.current.d3Force('charge', d3.forceManyBody().strength(-5));
        fgRef.current.d3Force('x', d3.forceX(window.innerWidth / 2).strength(3));
        fgRef.current.d3Force('y', d3.forceY(window.innerHeight / 2).strength(3));
    };

    const updateHoverState = (questId) => {
        const node = graphData.nodes.find((node) => node.id === questId);
        setHoverNode(node);
    };

    const handleNodeInteraction = (node, interactionType) => {
        if (interactionType === 'hover') {
            setHoverNode(node);
            if (node) {
                const nodesToHighlight = new Set();
                const linksToHighlight = new Set();
                nodesToHighlight.add(node);
                traverseGraph(node, nodesToHighlight, linksToHighlight);
                setHighlightNodes(nodesToHighlight);
                setHighlightLinks(linksToHighlight);
            } else {
                setHighlightNodes(new Set());
                setHighlightLinks(new Set());
            }
        } else if (interactionType === 'click') {
            setSelectedNode(node);
            const nodesToHighlight = new Set();
            const linksToHighlight = new Set();
            if (node) {
                nodesToHighlight.add(node);
                traverseGraph(node, nodesToHighlight, linksToHighlight);

                const prerequisitesMap = gatherPrerequisites(node.id);

                setSelectedNodeData({ questName: node.id, prerequisitesMap });
            }
            setHighlightNodes(nodesToHighlight);
            setSelectedLinks(linksToHighlight); // Update selectedLinks here
        }
    };

    const traverseGraph = (node, highlightNodes, highlightLinks) => {
        const traverse = (currentNode, isPrerequisite) => {
            graphData.links.forEach((link) => {
                if (
                    (isPrerequisite && link.target.id === currentNode.id) ||
                    (!isPrerequisite && link.source.id === currentNode.id)
                ) {
                    const linkWithRelation = { link: link, type: isPrerequisite ? 'prerequisite' : 'dependent' };
                    highlightLinks.add(linkWithRelation);
                    const nextNode = isPrerequisite ? link.source : link.target;
                    if (!highlightNodes.has(nextNode)) {
                        highlightNodes.add(nextNode);
                        traverse(nextNode, isPrerequisite);
                    }
                }
            });
        };

        traverse(node, true);
        traverse(node, false);
    };

    const gatherPrerequisites = (questName, depth = 0, maxSkills = {}, visitedQuests = new Set()) => {
        let prerequisitesMap = {};

        const visitQuest = (questName, depth, maxSkills) => {
            if (visitedQuests.has(questName) || !questRequirements[questName]) {
                return;
            }
            visitedQuests.add(questName);

            const currentSkills = questRequirements[questName].Skills || {};
            const combinedSkills = { ...maxSkills };
            Object.entries(currentSkills).forEach(([skill, level]) => {
                combinedSkills[skill] = Math.max(level, combinedSkills[skill] || 0);
            });

            prerequisitesMap[questName] = {
                name: questName,
                depth,
                skills: combinedSkills,
                prerequisites: [],
            };

            (questRequirements[questName].Quests || []).forEach((subQuest) => {
                prerequisitesMap[questName].prerequisites.push(subQuest);
                visitQuest(subQuest, depth + 1, combinedSkills);
            });
        };

        visitQuest(questName, depth, maxSkills);
        return prerequisitesMap;
    };
    const renderPrerequisites = (prereqs, questName, onQuestClick) => {

        const isWikiSyncEmpty = !WikiSync || Object.keys(WikiSync).length === 0;

        // Extract all skills and find the max requirement for each skill
        let maxSkills = {};
        Object.values(prereqs).forEach(quest => {
            Object.entries(quest.skills).forEach(([skill, level]) => {
                if (!maxSkills[skill] || maxSkills[skill] < level) {
                    maxSkills[skill] = level;
                }
            });
        });

        // Function to render dependent quests
        const renderDependentQuests = () => {
            return dependentQuests.map(quest => (
                <li key={quest.id} className="dependent-quest">
                    {renderQuestButton(quest.id)}
                </li>
            ));
        };

        // Create a mapping from quest name to quest object
        const questMap = Object.values(prereqs).reduce((map, quest) => {
            map[quest.name] = quest;
            return map;
        }, {});

        const renderQuestButton = (questId) => {
            const questStatusClass = WikiSync ? (
                graphData.nodes.find(node => node.id === questId)?.questStatus === 2 ? 'completed-quest' :
                    graphData.nodes.find(node => node.id === questId)?.questStatus === 1 ? 'in-progress-quest' :
                        'not-started-quest'
            ) : 'gray-quest'; // Default class for gray color

            return (
                <button
                    onMouseEnter={() => updateHoverState(questId)}
                    onMouseLeave={() => setHoverNode(null)}
                    onClick={() => onQuestClick(questId)}
                    className={`quest-button ${questStatusClass}`}
                >
                    {questId}
                </button>
            );
        };

        const renderQuest = (quest, isRoot = false) => {
            const children = quest.prerequisites.map(prereqName => questMap[prereqName]);

            // Add conditional class based on the quest status
            const questStatus = graphData.nodes.find(node => node.id === quest.name).questStatus;
            let questClass = '';
            if (questStatus === 2) {
                questClass = "completed-quest";
            } else if (questStatus === 1) {
                questClass = "in-progress-quest";
            } else if (questStatus === 0) {
                questClass = "not-started-quest";
            }

            return (
                <React.Fragment key={quest.name}>
                    {isRoot ? null : (
                        <li key={quest.name}>{renderQuestButton(quest.name)}</li>
                    )}
                    {children.length > 0 && (
                        <ul className="quest-list">
                            {children.map(childQuest => renderQuest(childQuest))}
                        </ul>
                    )}
                </React.Fragment>
            );
        };

        // Find root quests (those not being a prerequisite of any other quest)
        const rootQuests = Object.values(prereqs).filter(quest =>
            !Object.values(prereqs).some(otherQuest =>
                otherQuest.prerequisites.includes(quest.name)
            )
        );

        const dependentQuests = graphData.nodes.filter(node =>
            node.missingQuests.includes(questName) ||
            node.inprogressQuests.includes(questName) ||
            node.completedQuests.includes(questName)
        );


        return (
            <div className="parchment-background">
                <h2 className="box-title">{questName}</h2>
                <div className="side-by-side-container">
                    {rootQuests.length > 0 && rootQuests[0].prerequisites && rootQuests[0].prerequisites.length > 0 && (
                        <div className="list-container">
                            <br />
                            <h3>Prerequisite Quests:</h3>
                            <br />
                            <ul>
                                {rootQuests.map(quest => renderQuest(quest, true))}
                            </ul>
                        </div>
                    )}
                    {Object.keys(maxSkills).length > 0 && (
                        <div className="list-container">
                            <br />
                            <h3>Highest Skills Required:</h3>
                            <br />
                            <ul>
                                {Object.entries(maxSkills).map(([skill, level]) => {
                                    let listItemStyle = {};
                                    if (isWikiSyncEmpty) {
                                        listItemStyle = { color: 'black' };
                                    } else {
                                        const isMet = WikiSync.levels[skill] >= level;
                                        listItemStyle = { color: isMet ? 'green' : 'red' };
                                    }
                                    return (
                                        <li key={skill} style={listItemStyle}>
                                            {`${skill}: ${level}`}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                    {dependentQuests.length > 0 && (
                        <div className="list-container">
                            <br />
                            <h3>Required for Completing:</h3>
                            <br />
                            <ul>
                                {renderDependentQuests()}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const paintNode = (node, ctx, globalScale) => {
        const allSkillsMet = node.missingSkills.length === 0 && WikiSync;
        const allPrerequisitesMet = node.missingQuests.length === 0;
        const isWikiSyncEmpty = !WikiSync || Object.keys(WikiSync).length === 0;

        const nodeRadius = 11;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
        ctx.fillStyle = isWikiSyncEmpty
            ? 'gray'
            : allSkillsMet
                ? node.questStatus === 2
                    ? 'green'
                    : node.questStatus === 1
                        ? 'orange'
                        : allPrerequisitesMet
                            ? 'gray'
                            : 'red'
                : 'red';
        ctx.fill();

        if (selectedNodeData && node.id === selectedNodeData.questName) {
            const ringRadius = nodeRadius + 5;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(node.x, node.y, ringRadius, 0, 2 * Math.PI, false);
            ctx.stroke();
        }

        if (showLabels) {
            const label = node.id;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map((n) => n + fontSize * 0.2);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'black';
            ctx.fillText(label, node.x, node.y);
        }
    };


    const paintLink = (link, ctx, globalScale) => {
        let linkColor = 'rgba(0, 0, 0, 0.01)';
        let linkWidth = 0.5 / globalScale;

        const updateLinkStyle = (highlight, type) => {
            if (type === 'prerequisite') {
                linkColor = 'green';
                linkWidth = 3 / globalScale;
            } else if (type === 'dependent') {
                linkColor = 'orange';
                linkWidth = 3 / globalScale;
            }
        };

        selectedLinks.forEach((highlight) => {
            if (highlight.link === link) {
                updateLinkStyle(highlight, highlight.type);
            }
        });

        if (!selectedLinks.has(link)) {
            highlightLinks.forEach((highlight) => {
                if (highlight.link === link) {
                    updateLinkStyle(highlight, highlight.type);
                }
            });
        }

        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.strokeStyle = linkColor;
        ctx.lineWidth = linkWidth;
        ctx.stroke();
    };

    const distributeNodesVertically = (nodes, height) => {
        const independentNodes = nodes.filter((node) => node.isIndependent);
        const dependentNodes = nodes.filter((node) => !node.isIndependent);

        height = height * 1.15;

        const independentSpacing = height / (independentNodes.length + 1);
        independentNodes.forEach((node, index) => {
            node.x = -800;
            node.y = independentSpacing * (index + 1) - 600;
        });

        const columns = new Map();
        dependentNodes.forEach((node) => {
            const columnX = Math.round(node.x / 100) * 100;
            if (!columns.has(columnX)) {
                columns.set(columnX, []);
            }
            columns.get(columnX).push(node);
        });
        columns.forEach((columnNodes, x) => {
            columnNodes.sort((a, b) => a.y - b.y);
            const spacing = height / (columnNodes.length + 1);
            columnNodes.forEach((node, index) => {
                node.y = spacing * (index + 1) - 600;
                node.x = x + 100;
            });
        });
    };

    const renderNodeDetails = (nodeData) => {
        const { questName, prerequisitesMap } = nodeData;

        const onQuestClick = (questId) => {
            const node = graphData.nodes.find((node) => node.id === questId);
            if (node) {
                handleNodeInteraction(node, 'click');
            }
        };

        return (
            <div>
                <div className="node-info-container">
                    {renderPrerequisites(prerequisitesMap, questName, onQuestClick)}
                </div>
            </div>
        );
    };

    return (<div className="app-container"> <div className="force-graph-container">
        <div
            className="graph-background"
            onClick={(e) => {
                if (e.target.classList.value === '') {
                    setSelectedNodeData(null);
                    setSelectedNode(null);
                    setSelectedLinks(new Set());
                }
            }}
        >
            <div className="graph-container">
                <ForceGraph2D
                    ref={fgRef}
                    nodeVal={11}
                    graphData={graphData}
                    dagMode="lr"
                    dagLevelDistance={200}
                    nodeLabel="id"
                    onNodeHover={(node) => handleNodeInteraction(node, 'hover')}
                    onNodeClick={(node) => handleNodeInteraction(node, 'click')}
                    nodeCanvasObject={paintNode}
                    width={window.innerWidth}
                    height={window.innerHeight}
                    enableNodeDrag={false}
                    linkCanvasObjectMode={() => 'after'}
                    linkCanvasObject={paintLink}
                    d3AlphaDecay={1.3}
                    d3AlphaMin={0.01}
                    onEngineStop={() => {
                        distributeNodesVertically(graphData.nodes, window.innerHeight);
                    }}
                /> </div>
        </div>
    </div>
        {selectedNodeData && (<div className="banner-container">{renderNodeDetails(selectedNodeData)}</div>
        )} </div>
    );
};

export default QuestGraph;