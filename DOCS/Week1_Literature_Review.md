# AISecGuard: Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks

## Week 1 – Research Papers and Literature Review

**Project:** AISecGuard  
**Week:** 1  
**Work completed:** Collection and review of 10 research papers and technical resources related to AI supply chain security.

## Table of Contents

1. [Data Lineage & Provenance](#1-data-lineage--provenance)
2. [Model Integrity & Signing](#2-model-integrity--signing)
3. [Vulnerability Detection](#3-vulnerability-detection)
4. [Backdoor Detection](#4-backdoor-detection)
5. [Runtime Protection](#5-runtime-protection)
6. [MITRE ATLAS Integration](#6-mitre-atlas-integration)
7. [OWASP LLM Top 10 (2026)](#7-owasp-llm-top-10-2026)
8. [AI-BOM Standards](#8-ai-bom-standards)
9. [Industry Threat Intelligence](#9-industry-threat-intelligence)
10. [Compliance & Governance](#10-compliance--governance)

---

## 1. Data Lineage & Provenance

**Title:** Operationalising artificial intelligence bills of materials for verifiable AI provenance  
**Source:** Frontiers in Computer Science, 2026  
**Research area:** Data lineage, provenance, and AI supply chain security

**Source:** [Read the article](https://www.frontiersin.org/journals/computer-science/articles/10.3389/fcomp.2026.1735919/full)

### Main points

- Proposes a framework for cryptographic validation of AI data provenance.
- Uses agent-driven automation to support machine-verifiable lineage.
- Integrates with MLOps pipelines for continuous tracking.

### Literature review

This paper proposes an Artificial Intelligence Bill of Materials (AIBOM) framework to improve the security and transparency of AI systems. It focuses on tracking AI components, such as datasets, models, and software dependencies, throughout their lifecycle. The framework uses cryptographic verification and automated agents to maintain machine-verifiable records of AI provenance. It also integrates with MLOps pipelines to support continuous tracking and vulnerability identification.

One of the main strengths of this paper is its ability to verify the integrity and origin of AI components, helping developers identify unauthorised modifications. However, the framework mainly focuses on provenance and verification rather than comprehensive attack detection and mitigation.

### Relevance to AISecGuard

This paper provides a useful foundation for implementing AI component tracking and integrity verification in my project. I can extend this approach by adding automated attack detection and mitigation mechanisms to protect against AI supply chain attacks.

---

## 2. Model Integrity & Signing

**Title:** AI Bills of Materials (AI-BOMs) and Model Provenance  
**Source:** Foley & Lardner LLP, 2026  
**Research area:** AI supply chain security and model integrity

**Source:** [Read the article](https://www.foley.com/insights/publications/2026/07/ai-bills-of-materials-ai-boms-and-model-provenance-contracting-for-cybersecurity-in-ai-enabled-manufacturing-supply-chains/)

### Main points

- AI-BOMs identify models, datasets, and dependencies that may create cyber exposure.
- Model provenance documents origin, training, and security testing.
- Discusses contractual requirements for AI component cybersecurity.

### Literature review

This article discusses the importance of AI Bills of Materials (AI-BOMs) and model provenance in securing AI supply chains. It explains how AI-BOMs help identify models, datasets, software dependencies, and external APIs that may introduce cybersecurity risks. Model provenance helps track the origin of AI components, their training history, security testing, and modifications.

The article highlights the importance of maintaining updated AI-BOM records and including cybersecurity requirements in vendor contracts. This helps organisations identify vulnerable components, detect unauthorised changes, and investigate security incidents.

**Limitation:** The article mainly focuses on cybersecurity practices and contractual requirements rather than developing or experimentally evaluating a technical security framework.

### Relevance to AISecGuard

This article provides useful ideas for maintaining AI component inventories, tracking model changes, and establishing security requirements. These concepts can support the model integrity and supply chain monitoring features of my project.

---

## 3. Vulnerability Detection

**Title:** Securing the AI Supply Chain: Developer-Reported Security Issues  
**Source:** arXiv:2512.23385 (ICSE 2026)  
**Research area:** AI supply chain vulnerability detection

**Source:** [Read the paper](https://arxiv.org/abs/2512.23385)

### Main points

- Analyses 312,868 security discussions from Hugging Face and GitHub.
- Identifies a taxonomy of 32 security issues and 24 solutions.
- Covers system, external tools, model, and data security.

### Literature review

This paper investigates real-world security issues in AI supply chains by analysing 312,868 security discussions from Hugging Face and GitHub. The researchers identify 32 types of security issues and 24 solutions across system and software, external tools, models, and data. The study highlights how vulnerable dependencies, compromised models, and insecure data handling can introduce security risks into AI systems.

One of the main strengths of this paper is that it is based on real developer-reported security issues rather than only theoretical attacks. However, the study identifies that many model and data security problems still lack effective solutions.

### Relevance to AISecGuard

This paper helps me understand common AI supply chain vulnerabilities and provides a useful reference for designing automated vulnerability detection and mitigation features in my project.

---

## 4. Backdoor Detection

**Title:** Data Poisoning and Artificial Intelligence Modeling – Comprehensive Analysis  
**Source:** CEUR-WS, 2025  
**Research area:** Data poisoning and backdoor detection

**Source:** [Read the paper (PDF)](https://ceur-ws.org/Vol-4031/04_regular.pdf)

### Main points

- Presents a systematic framework for data poisoning attacks.
- Discusses data sanitisation techniques to remove poisoned samples.
- Evaluates defence effectiveness across attack types.

### Literature review

This paper presents a comprehensive analysis of data poisoning attacks and their impact on AI model security. It explains how attackers can manipulate training data to affect model behaviour, including introducing hidden backdoors. The authors discuss different defence techniques, such as data sanitisation, anomaly detection, and robust learning algorithms. They also propose a Dataset Core approach to reduce the impact of poisoned data while preserving useful information.

One of the main strengths of this paper is that it explains different poisoning attacks and their possible countermeasures. However, some of the proposed techniques may struggle against sophisticated attacks that closely resemble legitimate data.

### Relevance to AISecGuard

This paper helps me understand how poisoned datasets can introduce vulnerabilities into AI models. I can use these concepts to develop data validation, suspicious sample detection, and mitigation features in my project.

---

## 5. Runtime Protection

**Title:** Threat Mitigation and Privacy Strategies for Secure AI  
**Source:** Engineering, Technology & Applied Science Research (ETASR), 2025  
**Research area:** Runtime protection and AI security

**Source:** [Read the article](https://etasr.com/index.php/ETASR/article/view/12327)

### Main points

- Discusses adversarial robustness techniques for production AI.
- Covers differential privacy methods for security and privacy.
- Presents a framework applicable to a runtime protection layer.

### Literature review

This paper proposes a framework for improving the security and privacy of AI/ML workflows deployed in cloud environments. It focuses on protecting AI systems against adversarial attacks and sensitive data leakage. The authors use adversarial robustness techniques and differential privacy methods to improve model security and protect user information. The experimental results report 92% accuracy, 85% adversarial robustness, and a 90% privacy score.

One of the main strengths of this paper is that it considers both security and privacy in cloud-based AI systems. However, it mainly focuses on adversarial robustness and privacy rather than continuous monitoring and real-time attack mitigation.

### Relevance to AISecGuard

This paper helps me understand how adversarial attacks and privacy risks can be addressed in AI systems. I can use these concepts to strengthen the runtime protection layer of my project by incorporating security checks and monitoring mechanisms.

---

## 6. MITRE ATLAS Integration

**Title:** The Ultimate Guide to MITRE ATLAS (2026)  
**Source:** GetAstra  
**Research area:** AI threat modeling and attack detection

**Source:** [Read the guide](https://www.getastra.com/blog/security-audit/mitre-atlas/)

### Main points

- Explains the MITRE ATLAS framework for AI attack techniques.
- Describes a five-step security workflow for threat modeling.
- Maps AI attacks to documented adversary behaviour.

### Literature review

This article explains the MITRE ATLAS framework, which provides a structured approach to identifying and understanding attacks targeting AI and machine learning systems. It covers different attack techniques, including data poisoning, prompt injection, model extraction, and adversarial attacks. The article also discusses a five-step security workflow involving threat modeling, risk assessment, adversarial testing, integration with existing security frameworks, and continuous monitoring.

One of the main strengths of this article is that it provides a systematic way to map AI attacks to documented adversary behaviours and identify suitable security measures. However, it mainly provides practical guidance rather than presenting a new technical framework or experimental evaluation.

### Relevance to AISecGuard

This article helps me understand how to classify AI supply chain attacks using MITRE ATLAS. I can use this framework to organise attack detection rules, identify security gaps, and develop appropriate mitigation strategies for my project.

---

## 7. OWASP LLM Top 10 (2026)

**Title:** OWASP Top 10 for LLM Applications 2026  
**Source:** OWASP GenAI Security Project  
**Research area:** LLM security and AI supply chain vulnerabilities

**Source:** [Read the resource](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/)

### Main points

- Lists supply chain vulnerabilities as LLM04 (ranked #4 in the 2026 list).
- Covers compromised models, datasets, and dependencies.
- Recommends measures such as AI-BOMs, dependency pinning, and model signing.

### Literature review

This article explains the OWASP Top 10 for LLM Applications 2026, which identifies major security risks in large language model applications. It highlights supply chain vulnerabilities as LLM04, ranked fourth in the 2026 list. These risks include compromised AI models, manipulated datasets, and vulnerable software dependencies. The article also discusses security measures such as AI-BOMs, dependency pinning, and model signing to improve the integrity and security of AI systems.

One of the main strengths of this resource is that it provides a standardised way to understand and classify AI security risks. However, it mainly provides security guidelines rather than presenting a new technical framework or experimental evaluation.

**Note:** The 2026 OWASP list places Supply Chain at LLM04. The 2025 edition listed it as LLM03.

### Relevance to AISecGuard

This resource helps me identify and classify AI supply chain threats. I can use its recommendations to implement AI component tracking, dependency checks, and model integrity verification in my project.

---

## 8. AI-BOM Standards

**Title:** AI-BOM and ML-BOM Standards in 2026  
**Source:** Safeguard.sh  
**Research area:** AI supply chain security and component tracking

**Source:** [Read the article](https://safeguard.sh/resources/blog/ai-bill-of-materials-ml-bom-standards-2026)

### Main points

- Describes an eight-category AI-BOM schema covering models, data, infrastructure, and other components.
- Explains how AI-BOM extends SBOM concepts to AI-specific components.
- Provides implementation guidance for automated generation.

### Literature review

This article discusses AI-BOM and ML-BOM standards for improving the transparency and security of AI systems. It explains how traditional Software Bills of Materials (SBOMs) can be extended to include AI-specific components such as models, datasets, infrastructure, and dependencies. The article presents an eight-category AI-BOM schema and provides guidance for automatically generating and maintaining these records.

One of the main strengths of this article is that it provides a structured approach to identifying AI components and their potential security risks. However, it mainly focuses on standards and implementation guidance rather than developing and experimentally evaluating a new security framework.

### Relevance to AISecGuard

This article helps me understand how to design an AI-BOM structure for my project. I can use its concepts to maintain an inventory of AI components, identify vulnerable dependencies, and support automated supply chain security monitoring.

---

## 9. Industry Threat Intelligence

**Title:** H1 2026 Malware and Vulnerability Trends  
**Source:** Recorded Future  
**Research area:** Industry threat intelligence and AI supply chain security

**Source:** [Read the report](https://www.recordedfuture.com/research/h1-2026-malware-vulnerability-trends)

### Main points

- Reports a 73% increase in malicious open-source packages (2025).
- Lists 2,130 AI-related CVEs and a 34.6% year-over-year increase.
- Highlights supply chain attacks that abuse trusted access paths.

### Literature review

This report analyses cybersecurity threats observed during the first half of 2026, with particular attention to malware, software vulnerabilities, and supply chain attacks. It highlights the increasing use of trusted software platforms, developer tools, and third-party services by attackers to compromise systems. The report also discusses how malicious open-source packages and compromised developer credentials can introduce security risks into downstream applications.

One of the main strengths of this report is that it provides real-world threat intelligence and highlights how attackers exploit trusted access paths to compromise software supply chains. However, it mainly focuses on identifying threat trends rather than developing a new technical detection framework.

### Relevance to AISecGuard

This report helps me understand current supply chain attack methods, particularly malicious packages and compromised developer environments. I can use these findings to design automated dependency scanning, threat monitoring, and security checks for my project.

**Verification note:** The 73% increase is attributed to ReversingLabs in the report. The figure of 2,130 AI-related CVEs should be checked against the original report before being used as a confirmed statistic.

---

## 10. Compliance & Governance

**Title:** US CISA, G7 Partners in Europe and Asia Release Minimum Elements for AI Software Bills of Materials  
**Source:** Morgan Lewis, 2026  
**Research area:** AI supply chain compliance and governance

**Source:** [Read the article](https://www.morganlewis.com/pubs/2026/06/us-cisa-g7-partners-in-europe-and-asia-release-minimum-elements-for-ai-software-bills-of-materials)

### Main points

- Discusses seven required data clusters for AI-BOMs.
- Describes alignment with the EU AI Act and Executive Order 14110.
- Covers metadata, models, datasets, and security properties.

### Literature review

This article discusses the minimum elements required for AI Software Bills of Materials (AI-SBOMs), introduced through joint guidance from CISA and G7 partners. It explains seven information categories covering metadata, system properties, models, datasets, infrastructure, security properties, and performance indicators. These elements help organisations maintain transparency about AI components and identify potential security risks. The guidance is voluntary but may support organisations in meeting certain regulatory and contractual requirements.

One of the main strengths of this article is that it provides a standardised structure for documenting AI components and their security properties. However, it mainly focuses on compliance and documentation rather than developing an automated attack detection framework.

### Relevance to AISecGuard

This article helps me understand how to structure AI-BOM records according to recognised guidance. I can use these seven categories to organise component information and support vulnerability tracking, security monitoring, and compliance reporting in my project.

---

## Week 1 Summary

During the first week, I collected and reviewed 10 research papers and technical resources related to AI supply chain security. The review covered data lineage and provenance, model integrity, vulnerability detection, data poisoning, runtime protection, threat modeling, AI-BOM standards, industry threat intelligence, and compliance.

The reviewed resources provide useful concepts for the AISecGuard project, especially for maintaining AI component inventories, verifying integrity, identifying vulnerabilities, and organising attack detection and mitigation strategies.

### Potential areas to explore in the next project phase

- Define the AI components and supply chain stages AISecGuard will monitor.
- Design an AI-BOM structure for recording models, datasets, and dependencies.
- Identify vulnerability and integrity checks that can be automated.
- Map relevant attack categories to a threat-modeling framework.
- Plan how detection findings and mitigation actions will be recorded.

---

## References

1. [Operationalising artificial intelligence bills of materials for verifiable AI provenance](https://www.frontiersin.org/journals/computer-science/articles/10.3389/fcomp.2026.1735919/full)
2. [AI Bills of Materials (AI-BOMs) and Model Provenance](https://www.foley.com/insights/publications/2026/07/ai-bills-of-materials-ai-boms-and-model-provenance-contracting-for-cybersecurity-in-ai-enabled-manufacturing-supply-chains/)
3. [Securing the AI Supply Chain: Developer-Reported Security Issues](https://arxiv.org/abs/2512.23385)
4. [Data Poisoning and Artificial Intelligence Modeling – Comprehensive Analysis](https://ceur-ws.org/Vol-4031/04_regular.pdf)
5. [Threat Mitigation and Privacy Strategies for Secure AI](https://etasr.com/index.php/ETASR/article/view/12327)
6. [The Ultimate Guide to MITRE ATLAS (2026)](https://www.getastra.com/blog/security-audit/mitre-atlas/)
7. [OWASP Top 10 for LLM Applications 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/)
8. [AI-BOM and ML-BOM Standards in 2026](https://safeguard.sh/resources/blog/ai-bill-of-materials-ml-bom-standards-2026)
9. [H1 2026 Malware and Vulnerability Trends](https://www.recordedfuture.com/research/h1-2026-malware-vulnerability-trends)
10. [US CISA, G7 Partners in Europe and Asia Release Minimum Elements for AI Software Bills of Materials](https://www.morganlewis.com/pubs/2026/06/us-cisa-g7-partners-in-europe-and-asia-release-minimum-elements-for-ai-software-bills-of-materials)
