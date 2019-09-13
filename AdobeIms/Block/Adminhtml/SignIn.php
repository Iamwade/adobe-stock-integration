<?php
/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
declare(strict_types=1);

namespace Magento\AdobeIms\Block\Adminhtml;

use Magento\AdobeIms\Model\Config;
use Magento\Backend\Block\Template;
use Magento\Backend\Block\Template\Context;
use Magento\Authorization\Model\UserContextInterface;
use Magento\AdobeImsApi\Api\UserAuthorizedInterface;
use Magento\AdobeImsApi\Api\UserProfileRepositoryInterface;
use Magento\Framework\Serialize\Serializer\Json;

/**
 * Adobe Stock sign in block
 */
class SignIn extends Template
{
    /**
     * @var Config
     */
    private $config;

    /**
     * @var UserContextInterface
     */
    private $userContext;

    /**
     * @var UserAuthorizedInterface
     */
    private $userAuthorized;

    /**
     * @var UserProfileRepositoryInterface
     */
    private $userProfileRepository;

    /**
     * Json Serializer Instance
     *
     * @var Json
     */
    private $serializer;

    /**
     * SignIn constructor.
     *
     * @param Config $config
     * @param Context $context
     * @param UserContextInterface $userContext
     * @param UserAuthorizedInterface $userAuthorized
     * @param UserProfileRepositoryInterface $userProfileRepository
     * @param Json $json
     * @param array $data
     */
    public function __construct(
        Config $config,
        Context $context,
        UserContextInterface $userContext,
        UserAuthorizedInterface $userAuthorized,
        UserProfileRepositoryInterface $userProfileRepository,
        Json $json,
        array $data = []
    ) {
        $this->config = $config;
        $this->userContext = $userContext;
        $this->userAuthorized = $userAuthorized;
        $this->userProfileRepository = $userProfileRepository;
        $this->serializer = $json;
        parent::__construct($context, $data);
    }

    /**
     * Return auth url for adobe stock.
     *
     * @return string
     */
    public function getAuthUrl(): string
    {
        return $this->config->getAuthUrl();
    }


    /**
     * Return user name.
     *
     * @return Json
     * @throws \Magento\Framework\Exception\NoSuchEntityException
     */
    public function getUserData()
    {
        $data = [
            'email' => '',
            'display_name' => ''
        ];
        if ($this->isAuthorized()) {
            $userProfile = $this->userProfileRepository->getByUserId(
                (int)$this->userContext->getUserId()
            );
            $data['email'] = $userProfile->getEmail();
            $data['display_name'] = $userProfile->getName();
        }

        return $this->serializer->serialize($data);
    }

    /**
     * Checks if user authorized.
     *
     * @return bool
     */
    public function isAuthorized(): bool
    {
        return $this->userAuthorized->execute((int)$this->userContext->getUserId());
    }
}
